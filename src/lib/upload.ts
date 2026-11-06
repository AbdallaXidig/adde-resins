import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

export const uploadDir = () => path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
const MAX_BYTES = 10 * 1024 * 1024;

/** Re-encodes through sharp, so only genuine images are stored and embedded metadata is removed. */
export async function saveImage(file: File): Promise<string> {
  if (file.size === 0) throw new Error("Choose an image file.");
  if (file.size > MAX_BYTES) throw new Error("Images must be 10 MB or smaller.");
  const input = Buffer.from(await file.arrayBuffer());
  let output: Buffer;
  try {
    output = await sharp(input).rotate().resize({ width: 2000, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  } catch {
    throw new Error("That file is not a supported image.");
  }
  const name = `${crypto.randomUUID()}.webp`;
  await fs.mkdir(uploadDir(), { recursive: true });
  await fs.writeFile(path.join(uploadDir(), name), output);
  return `/media/${name}`;
}
