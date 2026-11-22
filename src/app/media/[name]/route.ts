import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { smallName, uploadDir } from "@/lib/upload";

const headers = (type: string) => ({ "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" });

// Recently served images stay in memory, so repeat views don't wait on the database.
const MAX_CACHE_BYTES = 40 * 1024 * 1024;
const cache = new Map<string, { data: Uint8Array; type: string }>();
let cachedBytes = 0;
function remember(key: string, data: Uint8Array, type: string) {
  if (data.length > MAX_CACHE_BYTES / 4) return;
  cache.set(key, { data, type });
  cachedBytes += data.length;
  for (const [k, v] of cache) {
    if (cachedBytes <= MAX_CACHE_BYTES) break;
    cache.delete(k);
    cachedBytes -= v.data.length;
  }
}

async function load(id: string) {
  const hit = cache.get(id);
  if (hit) {
    cache.delete(id); // move to the end: most recently used
    cache.set(id, hit);
    return hit;
  }
  const media = await prisma.mediaFile.findUnique({ where: { id }, select: { data: true, contentType: true } });
  if (!media) return null;
  const data = new Uint8Array(media.data);
  remember(id, data, media.contentType);
  return { data, type: media.contentType };
}

// Serves admin-uploaded images from the database (or, for older uploads, from UPLOAD_DIR).
// ?w=sm returns the 640px copy when one exists.
export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[0-9a-f-]{36}\.webp$/.test(name)) return new Response("Not found", { status: 404 });
  const wantSmall = new URL(req.url).searchParams.get("w") === "sm";
  const file = (wantSmall && (await load(smallName(name)))) || (await load(name));
  if (file) return new Response(file.data as BodyInit, { headers: headers(file.type) });
  try {
    const disk = await fs.readFile(path.join(uploadDir(), name));
    return new Response(new Uint8Array(disk), { headers: headers("image/webp") });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
