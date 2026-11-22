import "server-only";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { prisma } from "@/lib/db";

/** Legacy location of uploads saved to disk before images moved into the database. */
export const uploadDir = () => path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
const MAX_BYTES = 10 * 1024 * 1024;

/** Name of the 640px copy saved next to each upload. */
export const smallName = (name: string) => name.replace(/\.webp$/, "-sm.webp");

/**
 * Re-encodes through sharp, so only genuine images are stored and embedded metadata is removed.
 * The image is saved in the database, so it survives restarts and redeploys on hosts without a disk.
 */
export async function saveImage(file: File): Promise<string> {
  if (file.size === 0) throw new Error("Choose an image file.");
  if (file.size > MAX_BYTES) throw new Error("Images must be 10 MB or smaller.");
  const input = Buffer.from(await file.arrayBuffer());
  let large: Buffer, small: Buffer;
  try {
    // Two sizes, made once here, so pages never resize images while a visitor waits.
    const base = sharp(input).rotate();
    large = await base.clone().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
    small = await base.clone().resize({ width: 640, withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
  } catch {
    throw new Error("That file is not a supported image.");
  }
  const id = crypto.randomUUID();
  await prisma.mediaFile.createMany({
    data: [
      { id: `${id}.webp`, data: new Uint8Array(large), size: large.length },
      { id: smallName(`${id}.webp`), data: new Uint8Array(small), size: small.length },
    ],
  });
  return `/media/${id}.webp`;
}

/** Removes a stored upload once nothing points at it. Ignores stock photos under /assets. */
export async function deleteImage(url: string) {
  const name = url.startsWith("/media/") ? url.slice("/media/".length) : null;
  if (!name) return;
  if ((await prisma.productImage.count({ where: { url } })) > 0) return;
  await prisma.mediaFile.deleteMany({ where: { id: { in: [name, smallName(name)] } } });
}
