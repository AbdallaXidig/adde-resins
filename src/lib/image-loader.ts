"use client";

// Serves images that were resized ahead of time, so the server never resizes while a visitor waits.
// Site photos: scripts/optimize-images.mjs writes /assets/opt/<path>-<width>.webp at build time.
// Admin uploads: saved in two sizes at upload (src/lib/upload.ts); /media/<id>?w=sm picks the small one.
const WIDTHS = [128, 256, 384, 640, 960, 1280, 1920]; // keep in sync with scripts/optimize-images.mjs

export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }) {
  const w = WIDTHS.find((x) => x >= width) ?? WIDTHS[WIDTHS.length - 1];
  if (src.startsWith("/assets/") && !src.startsWith("/assets/opt/")) {
    return `/assets/opt/${src.slice("/assets/".length).replace(/\.(webp|png|jpe?g)$/i, "")}-${w}.webp`;
  }
  if (src.startsWith("/media/")) return w <= 640 ? `${src}?w=sm&v=${w}` : `${src}?v=${w}`;
  return src;
}
