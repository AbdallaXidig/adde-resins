import "server-only";
import { redirect } from "next/navigation";

export const str = (f: FormData, k: string, max = 4000) => String(f.get(k) ?? "").trim().slice(0, max);
export const optStr = (f: FormData, k: string, max = 4000) => str(f, k, max) || null;
export const bool = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";
export const lines = (f: FormData, k: string) => str(f, k, 8000).split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, 50);
export function num(f: FormData, k: string): number | null {
  const v = str(f, k, 40);
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) fail(f, `"${k}" must be a positive number.`);
  return n;
}
export const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

/** Redirects back with a message shown by <Flash>. */
export function fail(f: FormData | null, message: string, path?: string): never {
  const back = path ?? String(f?.get("_back") ?? "/admin");
  redirect(`${safeBack(back)}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
}
export function done(path: string, message = "Saved"): never {
  redirect(`${safeBack(path)}${path.includes("?") ? "&" : "?"}saved=${encodeURIComponent(message)}`);
}
const safeBack = (p: string) => (p.startsWith("/admin") ? p.split(/[?&](saved|error)=/)[0] : "/admin");
