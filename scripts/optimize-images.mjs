// Pre-resizes every image under public/assets into public/assets/opt/<path>-<width>.webp,
// so the server never resizes images while visitors wait. Runs before `next build` and `next dev`.
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const WIDTHS = [128, 256, 384, 640, 960, 1280, 1920]; // keep in sync with src/lib/image-loader.ts
const ROOT = path.resolve("public/assets");
const OUT = path.join(ROOT, "opt");
sharp.concurrency(1);

async function* walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (p !== OUT) yield* walk(p); }
    else if (/\.(webp|png|jpe?g)$/i.test(e.name)) yield p;
  }
}

let made = 0;
const started = Date.now();
for await (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file).replace(/\.(webp|png|jpe?g)$/i, "");
  const srcTime = (await fs.stat(file)).mtimeMs;
  const input = await fs.readFile(file);
  for (const w of WIDTHS) {
    const out = path.join(OUT, `${rel}-${w}.webp`);
    const existing = await fs.stat(out).catch(() => null);
    if (existing && existing.mtimeMs >= srcTime) continue;
    await fs.mkdir(path.dirname(out), { recursive: true });
    await sharp(input).resize({ width: w, withoutEnlargement: true }).webp({ quality: w <= 384 ? 70 : w >= 1280 ? 66 : 74, effort: 4 }).toFile(out);
    made++;
  }
}
console.log(`optimize-images: ${made} new files in ${((Date.now() - started) / 1000).toFixed(1)}s`);
