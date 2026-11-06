"use client";
import { useActionState } from "react";
import { loginAction } from "@/app/admin/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, { error: "" });
  return (
    <form action={action} className="mt-6 space-y-4">
      <div><label htmlFor="email" className="field-label">Email</label><input id="email" name="email" type="email" required autoComplete="username" className="field" /></div>
      <div><label htmlFor="password" className="field-label">Password</label><input id="password" name="password" type="password" required autoComplete="current-password" className="field" /></div>
      {state.error && <p role="alert" className="rounded-lg bg-[#f9e1e2] px-3 py-2 text-sm text-[#86141a]">{state.error}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>{pending ? "Signing in..." : "Sign in"}</button>
    </form>
  );
}
