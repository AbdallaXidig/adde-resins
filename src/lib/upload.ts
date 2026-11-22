import "server-only";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { prisma } from "@/lib/db";

/** Legacy location of uploads saved to disk before images moved into the database. */
export const uploadDir = () => path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Re-encodes through sharp, so only genuine images are stored and embedded metadata is removed.
 * The image is saved in the database, so it survives restarts and redeploys on hosts without a disk.
 */
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
  await prisma.mediaFile.create({ data: { id: name, data: new Uint8Array(output), size: output.length } });
  return `/media/${name}`;
}

/** Removes a stored upload once nothing points at it. Ignores stock photos under /assets. */
export async function deleteImage(url: string) {
  const name = url.startsWith("/media/") ? url.slice("/media/".length) : null;
  if (!name) return;
  if ((await prisma.productImage.count({ where: { url } })) > 0) return;
  await prisma.mediaFile.deleteMany({ where: { id: name } });
}
