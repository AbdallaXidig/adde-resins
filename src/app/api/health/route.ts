// Tiny endpoint for the keep-awake ping (Supabase pg_cron calls it every 10 minutes),
// so Render's free plan doesn't put the site to sleep and visitors don't wait for a cold start.
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
