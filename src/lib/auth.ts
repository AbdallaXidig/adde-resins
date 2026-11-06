import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { prisma } from "./db";
import { can, type Permission } from "./permissions";
import { SESSION_COOKIE } from "./session-constants";

const SESSION_HOURS = 12;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set to at least 32 characters.");
  return new TextEncoder().encode(s);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export type LoginResult = { ok: true } | { ok: false; error: "invalid" | "locked" };

// One error for unknown email and wrong password, and a hash comparison in both cases,
// so the response does not reveal which accounts exist.
const DUMMY_HASH = "$2b$12$CwTycUXWue0Thq9StjUM0uJ8Y0mXQXo7iIY0z7o0kRrJp7mUe4v6a";

export async function login(email: string, password: string): Promise<LoginResult> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !user.active) return { ok: false, error: "invalid" };
  if (user.lockedUntil && user.lockedUntil > new Date()) return { ok: false, error: "locked" };

  if (!valid) {
    const failed = user.failedLogins + 1;
    const locking = failed >= MAX_FAILED;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: locking ? 0 : failed,
        lockedUntil: locking ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      },
    });
    return { ok: false, error: locking ? "locked" : "invalid" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  const token = await new SignJWT({ v: user.sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret());

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http://"),
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  return { ok: true };
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    // Deactivating a user, or changing their password or role, ends their session at once.
    if (!user || !user.active || user.sessionVersion !== payload.v) return null;
    return user;
  } catch {
    return null;
  }
});

/** Use at the top of every admin page and server action. */
export async function requirePermission(permission: Permission): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!can(user.role, permission)) redirect("/admin?denied=1");
  return user;
}

export async function audit(userId: string | null, action: string, entity: string, entityId?: string, meta?: object) {
  await prisma.auditLog.create({ data: { userId, action, entity, entityId, meta: meta ?? undefined } });
}
