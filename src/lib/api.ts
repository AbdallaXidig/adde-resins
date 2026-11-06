import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { clientIp, rateLimit } from "./rate-limit";
import { fieldErrors } from "./validation";

/** Shared guard for public form endpoints: size cap, rate limit, JSON parse and validation. */
export async function parsePublic<S extends z.ZodTypeAny>(req: Request, schema: S, bucket: string):
  Promise<{ data: z.infer<S> } | { response: NextResponse }> {
  if (!rateLimit(`${bucket}:${clientIp(req.headers)}`, 8, 10 * 60_000)) {
    return { response: NextResponse.json({ error: "rateLimited" }, { status: 429 }) };
  }
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return { response: NextResponse.json({ error: "badRequest" }, { status: 415 }) };
  }
  const text = await req.text();
  if (text.length > 64_000) return { response: NextResponse.json({ error: "tooLarge" }, { status: 413 }) };
  let json: unknown;
  try { json = JSON.parse(text); } catch { return { response: NextResponse.json({ error: "badRequest" }, { status: 400 }) }; }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return { response: NextResponse.json({ errors: fieldErrors(parsed.error) }, { status: 422 }) };
  return { data: parsed.data };
}

export function serverError(error: unknown) {
  console.error(error);
  return NextResponse.json({ error: "server" }, { status: 500 });
}
