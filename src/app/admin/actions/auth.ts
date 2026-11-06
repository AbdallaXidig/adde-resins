"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { audit, login, logout, getCurrentUser } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function loginAction(_prev: { error: string }, form: FormData) {
  const ip = clientIp(await headers());
  if (!rateLimit(`login:${ip}`, 10, 15 * 60_000)) return { error: "Too many attempts. Please wait 15 minutes." };
  const email = String(form.get("email") ?? "").slice(0, 200);
  const password = String(form.get("password") ?? "").slice(0, 200);
  const result = await login(email, password);
  if (!result.ok) {
    return { error: result.error === "locked" ? "This account is temporarily locked after repeated failed attempts. Try again in 15 minutes." : "Email or password is incorrect." };
  }
  const user = await getCurrentUser();
  await audit(user?.id ?? null, "login", "User", user?.id);
  redirect("/admin");
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}
