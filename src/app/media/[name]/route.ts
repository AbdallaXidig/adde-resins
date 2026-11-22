import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { uploadDir } from "@/lib/upload";

const headers = (type: string) => ({ "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" });

// Serves admin-uploaded images from the database (or, for older uploads, from UPLOAD_DIR).
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[0-9a-f-]{36}\.webp$/.test(name)) return new Response("Not found", { status: 404 });
  const media = await prisma.mediaFile.findUnique({ where: { id: name } });
  if (media) return new Response(new Uint8Array(media.data), { headers: headers(media.contentType) });
  try {
    const file = await fs.readFile(path.join(uploadDir(), name));
    return new Response(new Uint8Array(file), { headers: headers("image/webp") });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
