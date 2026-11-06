"use server";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit, hashPassword, requirePermission } from "@/lib/auth";
import { done, fail, str } from "@/lib/admin-helpers";

const ROLES: Role[] = ["SUPER_ADMIN", "MANAGER", "SALES", "CONTENT"];
const BACK = "/admin/users";

function checkPassword(p: string) {
  if (p.length < 12) fail(null, "Passwords must be at least 12 characters.", BACK);
}

export async function createUser(f: FormData) {
  const actor = await requirePermission("users");
  const email = str(f, "email", 200).toLowerCase();
  const name = str(f, "name", 120);
  const role = str(f, "role") as Role;
  const password = String(f.get("password") ?? "");
  if (!/^\S+@\S+\.\S+$/.test(email) || !name || !ROLES.includes(role)) fail(null, "Enter a name, valid email and role.", BACK);
  checkPassword(password);
  if (await prisma.user.findUnique({ where: { email } })) fail(null, "A user with that email already exists.", BACK);
  const user = await prisma.user.create({ data: { email, name, role, passwordHash: await hashPassword(password) } });
  await audit(actor.id, "create", "User", user.id, { email, role });
  done(BACK, `User ${email} created`);
}

async function superAdminsLeft(excludingId: string) {
  return prisma.user.count({ where: { role: "SUPER_ADMIN", active: true, id: { not: excludingId } } });
}

export async function updateUser(f: FormData) {
  const actor = await requirePermission("users");
  const id = str(f, "id", 40);
  const role = str(f, "role") as Role;
  const active = f.get("active") === "on";
  if (!ROLES.includes(role)) fail(null, "Invalid role.", BACK);
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) fail(null, "User not found.", BACK);
  if (id === actor.id && (!active || role !== target.role)) fail(null, "You cannot change your own role or deactivate yourself.", BACK);
  if (target.role === "SUPER_ADMIN" && (role !== "SUPER_ADMIN" || !active) && (await superAdminsLeft(id)) === 0) {
    fail(null, "At least one active super admin is required.", BACK);
  }
  const password = String(f.get("password") ?? "");
  if (password) checkPassword(password);
  const changed = role !== target.role || active !== target.active || !!password;
  await prisma.user.update({
    where: { id },
    data: {
      role, active,
      ...(password ? { passwordHash: await hashPassword(password), failedLogins: 0, lockedUntil: null } : {}),
      // Ends the user's existing sessions so the change takes effect immediately.
      ...(changed ? { sessionVersion: { increment: 1 } } : {}),
    },
  });
  await audit(actor.id, "update", "User", id, { role, active, passwordReset: !!password });
  done(BACK, `${target.email} updated`);
}
