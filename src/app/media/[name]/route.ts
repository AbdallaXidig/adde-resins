import fs from "node:fs/promises";
import path from "node:path";
import { uploadDir } from "@/lib/upload";

// Serves admin-uploaded images from UPLOAD_DIR, which can live outside the build.
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[0-9a-f-]{36}\.webp$/.test(name)) return new Response("Not found", { status: 404 });
  try {
    const file = await fs.readFile(path.join(uploadDir(), name));
    return new Response(new Uint8Array(file), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
