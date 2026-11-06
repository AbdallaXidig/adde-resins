// Downloads the licensed photo set from Wikimedia Commons, converts each to WebP,
// and writes the licence register that powers the public /image-credits page.
// Run once: node scripts/fetch-images.mjs   (re-run only when the manifest changes)
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT = path.resolve("public/assets/img");
const CREDITS = path.resolve("src/data/image-credits.json");
const UA = "AddeSiteBuild/1.0 (image licence register)";

// `location`: where the photo was really taken, when known. Photos are never presented
// as Adde International's own harvest sites, facilities, staff or stock.
const MANIFEST = [
  // Genuine Somali locations
  { key: "somalia-karin-bosaso", title: "File:Karin, Bosaso, Somalia1.jpg", w: 2400, location: "Karin, Bosaso, Somalia", alt: "Mountains and palm groves at Karin near Bosaso, Somalia", use: "Hero, About" },
  { key: "somalia-karin-trees", title: "File:Karin, Bosaso, Somalia3.jpg", w: 2000, location: "Karin, Bosaso, Somalia", alt: "Acacia trees on red earth at Karin near Bosaso, Somalia", use: "About" },
  { key: "somalia-bosaso-port", title: "File:Bosaso Port.jpg", w: 2400, location: "Bosaso, Somalia", alt: "Aerial view of Bosaso port on the Gulf of Aden, Somalia", use: "Hero, Export & logistics" },
  { key: "somalia-bosaso-sunset", title: "File:SunSet at Bosaso Beach.png", w: 2000, location: "Bosaso, Somalia", alt: "Sunset over the sea at Bosaso beach, Somalia", use: "Contact" },
  { key: "somalia-golis-road", title: "File:Somaliland, Golis mountains, road (2).jpg", w: 2000, location: "Golis mountains, northern Somalia", alt: "Road winding through the Golis mountains of northern Somalia", use: "Sourcing" },
  { key: "tree-frereana-somalia", title: "File:Somalia-Boswellia frereana-2.jpg", w: 672, location: "Somalia", alt: "Boswellia frereana tree growing from rock in Somalia", use: "Sourcing, Frereana gallery" },

  // Trees and bark: the same genus, photographed in Oman
  { key: "tree-boswellia-landscape", title: "File:Boswellia sacra kz03.jpg", w: 2000, location: "Dhofar, Oman (illustrative)", alt: "Boswellia sacra frankincense tree in open arid landscape", use: "Sourcing" },
  { key: "tree-resin-on-bark", title: "File:Boswellia sacra kz05.jpg", w: 1600, location: "Oman (illustrative)", alt: "White frankincense resin beads forming on Boswellia bark", use: "Sourcing, Harvesting" },
  { key: "tree-papery-bark", title: "File:Corteccia-Boswellia.jpg", w: 1536, location: "Illustrative", alt: "Close-up of papery peeling Boswellia bark", use: "Carterii gallery, Sourcing" },
  { key: "tree-bark-detail", title: "File:Boswellia sacra bark.jpg", w: 1600, location: "Illustrative", alt: "Textured layers of Boswellia bark", use: "Quality" },

  // Product photography
  { key: "resin-bowl-closeup", title: "File:Boswellia Resin Close Up.jpg", w: 2000, location: "Illustrative", alt: "Golden frankincense resin tears in a clear glass bowl", use: "Frankincense Carterii" },
  { key: "resin-dark-dish", title: "File:Frankincense Weihrauch im Gefäß 01.jpg", w: 2400, location: "Illustrative", alt: "Amber frankincense pieces in a metal dish on a dark background", use: "Hero, Hojari" },
  { key: "resin-dark-dish-close", title: "File:Frankincense Weihrauch im Gefäß.jpg", w: 1600, location: "Illustrative", alt: "Amber frankincense in a metal dish, seen from above", use: "Hojari gallery" },
  { key: "resin-pieces-black", title: "File:Frankincense 2005-12-31.jpg", w: 1200, location: "Illustrative", alt: "Large pale frankincense pieces on a black background", use: "Carterii gallery" },
  { key: "resin-pale-glass", title: "File:Olebanum.jpg", w: 1600, location: "Illustrative", alt: "Pale cream olibanum resin in a glass dish", use: "Frankincense Frereana" },
  { key: "resin-tears-uniform", title: "File:Frankincense IMG 9780.JPG", w: 1372, location: "Illustrative", alt: "Uniform rounded frankincense tears in a glass dish", use: "Grade A" },
  { key: "resin-golden-white", title: "File:Olibanum resin.jpg", w: 1160, location: "Illustrative", alt: "Golden olibanum resin pieces on white", use: "Grade A gallery" },
  { key: "resin-sack-mixed", title: "File:Bag of frankincense at Dubai spice souk.jpg", w: 2000, location: "Dubai spice souk (illustrative)", alt: "Open sack of mixed frankincense pieces at a spice market", use: "Grade B" },
  { key: "resin-grey-bowl", title: "File:Boswellia Resin in a grey bowl - 50191148388.jpg", w: 2000, location: "Illustrative", alt: "Boswellia resin in a grey stone bowl", use: "Quality, Grading" },

  // Myrrh and other resins
  { key: "myrrh-amber-pieces", title: "File:Myrrh-20180430.jpg", w: 1044, location: "Illustrative", alt: "Reddish amber myrrh pieces on a warm background", use: "Myrrh" },
  { key: "myrrh-glass-dish", title: "File:Myrrh IMG 9777.JPG", w: 1593, location: "Illustrative", alt: "Dark rough myrrh lumps in a glass dish", use: "Myrrh gallery" },
  { key: "myrrh-pile", title: "File:Myrrh.JPG", w: 1600, location: "Illustrative", alt: "Pile of raw myrrh resin", use: "Myrrh gallery" },
  { key: "opoponax-lump", title: "File:Opoponax1.JPG", w: 2000, location: "Illustrative", alt: "Lump of opoponax resin on a pale background", use: "Other natural resins" },

  // Logistics
  { key: "logistics-terminal-sunset", title: "File:OOCL Australia (ship, 2006) 001.jpg", w: 2000, location: "Illustrative", alt: "Container terminal cranes at sunset", use: "Services" },
  { key: "logistics-ship-sea", title: "File:Sara Borchard (IMO 9354428) arriving at Dublin.jpg", w: 2000, location: "Illustrative", alt: "Container ship at sea", use: "Services" },
  { key: "packaging-sacks", title: "File:Mercado de Chorsu 07.jpg", w: 2000, location: "Illustrative", alt: "Open woven sacks of natural dry goods", use: "Services, packaging" },

  // Industries
  { key: "industry-pharma", title: "File:Antique brass pharmacy mortar weighing 2.3 kg - Picture 1.jpg", w: 1600, location: "Illustrative", alt: "Brass pharmacy mortar and pestle", use: "Pharmaceuticals" },
  { key: "industry-nutra", title: "File:Ayurveda - Turmeric, Boswellia, Ashwagandha and Fenugreek - 50191955812.jpg", w: 1600, location: "Illustrative", alt: "Bowls of Boswellia and botanical ingredients on dark wood", use: "Nutraceuticals" },
  { key: "industry-perfume", title: "File:Perfume Bottles.JPG", w: 1600, location: "Illustrative", alt: "Amber perfume bottles arranged on a table", use: "Perfumes & fragrances" },
  { key: "industry-aromatherapy", title: "File:Rosemary Oil in a bottle and rosemary herb.jpg", w: 1600, location: "Illustrative", alt: "Amber essential oil dropper bottle with herbs", use: "Aromatherapy" },
  { key: "industry-cosmetics", title: "File:Natural herbal powder container placed on marble surface ready for culinary use and beauty treatments.jpg", w: 1600, location: "Illustrative", alt: "Natural powder container on a marble surface", use: "Cosmetics & personal care" },
  { key: "industry-incense", title: "File:Incense burner at Yakuo-in.jpg", w: 1600, location: "Illustrative", alt: "Hands placing incense in a burner with rising smoke", use: "Incense & religious use" },
  { key: "industry-manufacturers", title: "File:Eucalypt oils 1.jpg", w: 1600, location: "Illustrative", alt: "Laboratory cylinders of natural oils in amber tones", use: "Natural product manufacturers" },
];

const strip = (html = "") => html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, tries = 6) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return res;
    if (res.status === 429 || res.status >= 500) { await sleep(20000 * (i + 1)); continue; }
    throw new Error(`${res.status} ${url}`);
  }
  throw new Error(`Gave up: ${url}`);
}

await fs.mkdir(OUT, { recursive: true });
await fs.mkdir(path.dirname(CREDITS), { recursive: true });
const credits = [];

for (const item of MANIFEST) {
  const params = new URLSearchParams({
    action: "query", format: "json", titles: item.title, prop: "imageinfo",
    iiprop: "url|size|extmetadata", iiurlwidth: String(item.w),
    iiextmetadatafilter: "LicenseShortName|LicenseUrl|Artist",
  });
  const meta = await (await get(`https://commons.wikimedia.org/w/api.php?${params}`)).json();
  const page = Object.values(meta.query.pages)[0];
  const info = page.imageinfo?.[0];
  if (!info) { console.error("MISSING", item.title); continue; }
  const m = info.extmetadata ?? {};
  const licence = strip(m.LicenseShortName?.value);
  if (!/CC|public domain|no restrictions/i.test(licence) || /NC|ND/.test(licence)) {
    console.error("REJECTED LICENCE", item.title, licence);
    continue;
  }
  const file = path.join(OUT, `${item.key}.webp`);
  // Resumable: keep files already converted so a rate-limit never restarts the whole set.
  let out;
  const exists = await fs.stat(file).then(() => true, () => false);
  if (exists) {
    const meta2 = await sharp(file).metadata();
    out = { width: meta2.width, height: meta2.height };
  } else {
    await sleep(3000);
    const src = (info.thumburl ?? info.url).split("?")[0];
    let buf;
    try {
      buf = Buffer.from(await (await get(src, 3)).arrayBuffer());
    } catch (e) {
      console.error("SKIPPED (re-run later)", item.key, e.message);
      continue;
    }
    out = await sharp(buf).rotate()
      .resize({ width: item.w, withoutEnlargement: true })
      .webp({ quality: 80 }).toFile(file);
  }
  credits.push({
    key: item.key,
    file: `/assets/img/${item.key}.webp`,
    width: out.width, height: out.height,
    alt: item.alt,
    usedFor: item.use,
    location: item.location,
    source: "Wikimedia Commons",
    sourceUrl: info.descriptionurl,
    title: item.title.replace(/^File:/, ""),
    author: strip(m.Artist?.value).slice(0, 120) || "See source page",
    licence,
    licenceUrl: m.LicenseUrl?.value ?? "",
    replaceWithCompanyPhoto: !/Somalia/.test(item.location),
  });
  console.log("ok", item.key, out.width, out.height, licence);
  await sleep(1200);
}
await fs.writeFile(CREDITS, JSON.stringify(credits, null, 2) + "\n");
console.log(`Wrote ${credits.length} images and the licence register.`);
