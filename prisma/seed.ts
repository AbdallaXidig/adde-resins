// Creates the first admin, starting settings and SAMPLE catalogue. Safe to re-run: it never
// overwrites products or categories that already exist, so staff edits are preserved.
// Every sample product is isDemo=true and rendered with a visible "sample data" label.
import bcrypt from "bcryptjs";
import { PrismaClient, type Availability } from "@prisma/client";

const prisma = new PrismaClient();
const TBC = "To be confirmed";

const categories = [
  { slug: "frankincense", name: "Frankincense", description: "Resin of Boswellia trees.", sortOrder: 1, translations: { so: { name: "Beeyo iyo Maydi (Luubaan)" }, ar: { name: "اللبان" } } },
  { slug: "frankincense-grades", name: "Frankincense by Grade", description: "Frankincense sold by sorted grade.", sortOrder: 2, translations: { so: { name: "Luubaan darajooyin" }, ar: { name: "اللبان حسب الدرجة" } } },
  { slug: "myrrh", name: "Myrrh", description: "Resin of Commiphora trees.", sortOrder: 3, translations: { so: { name: "Malmal" }, ar: { name: "المر" } } },
  { slug: "other-resins", name: "Other Natural Resins", description: "Other gums and resins from the Horn of Africa.", sortOrder: 4, translations: { so: { name: "Xabagyo kale" }, ar: { name: "راتنجات طبيعية أخرى" } } },
];

const standardSpecs = (extra: [string, string][] = []) => [
  ...extra,
  ["Moisture", TBC],
  ["Foreign matter", TBC],
  ["Lot documents", TBC],
] as [string, string][];

type Sample = {
  slug: string; category: string; name: string; botanicalName: string; localName?: string;
  shortDescription: string; description: string; botanicalInfo: string; grade: string; gradeOptions: string[];
  gradingInfo: string; images: [string, string][]; specs: [string, string][]; featured?: boolean;
  status?: "DRAFT" | "PUBLISHED"; availability?: Availability; seoTitle: string; seoDescription: string;
  translations?: object;
};

const PACKAGING = ["Sample listing: agreed for each order"];
const QUANTITIES = ["Quoted in kilograms (KG)", "Quoted in metric tons (MT)"];

const products: Sample[] = [
  {
    slug: "frankincense-boswellia-carterii", category: "frankincense", featured: true,
    name: "Frankincense (Boswellia Carterii)", botanicalName: "Boswellia carterii Birdw.", localName: "Beeyo",
    shortDescription: "Classic Somali frankincense with a warm, balsamic and resinous aroma.",
    description: "Boswellia carterii, known in Somalia as Beeyo, is one of the classic frankincense resins of the Horn of Africa. Its warm, balsamic aroma has made it a long-standing choice for incense makers, perfumers and distillers. Lots are supplied by grade, and the specification of each lot is agreed with the buyer.",
    botanicalInfo: "Family Burseraceae. Grows on dry rocky slopes in northern Somalia. Many modern botanical references treat Boswellia carterii as a synonym of Boswellia sacra, though the name carterii remains standard in the Somali resin trade.",
    grade: "Sorted grades", gradeOptions: ["Grade A", "Grade B", "Mixed"],
    gradingInfo: "Sorted by hand according to tear size, colour and cleanliness. Grade names vary in the trade, so the meaning of each grade is confirmed in your quotation.",
    images: [["/assets/img/resin-bowl-closeup.webp", "Golden frankincense resin tears in a clear glass bowl"], ["/assets/img/resin-pieces-black.webp", "Large pale frankincense pieces on a black background"], ["/assets/img/tree-papery-bark.webp", "Close-up of papery peeling Boswellia bark"]],
    specs: standardSpecs([["Form", "Natural resin tears and pieces"]]),
    seoTitle: "Boswellia Carterii Somalia | Frankincense Bulk Supplier",
    seoDescription: "Boswellia carterii (Beeyo) frankincense from Somalia, supplied by grade. Request a wholesale quotation from Adde International.",
    translations: { so: { name: "Luubaan Beeyo (Boswellia Carterii)", shortDescription: "Luubaan Soomaaliyeed oo caan ah, leh ur diiran oo xabag ah." }, ar: { name: "لبان (بوسويليا كارتيري)", shortDescription: "لبان صومالي كلاسيكي ذو رائحة دافئة وبلسمية." } },
  },
  {
    slug: "frankincense-boswellia-frereana", category: "frankincense", featured: true,
    name: "Frankincense (Boswellia Frereana)", botanicalName: "Boswellia frereana Birdw.", localName: "Maydi",
    shortDescription: "Pale Maydi frankincense with a fresh, lemony aroma, also known as Coptic frankincense.",
    description: "Boswellia frereana, known in Somalia as Maydi, grows on the limestone cliffs of northern Somalia. It is valued for its pale pieces and fresh, citrus-like aroma, and it is traditionally chewed as well as burned. It is often called Coptic frankincense in the trade.",
    botanicalInfo: "Family Burseraceae. Native to northern Somalia, where it often grows directly out of limestone rock faces.",
    grade: "Sorted grades", gradeOptions: ["Grade A", "Grade B", "Mixed"],
    gradingInfo: "Generally sorted according to piece size, colour and clarity. The meaning of each grade is confirmed in your quotation.",
    images: [["/assets/img/resin-pale-glass.webp", "Pale cream olibanum resin in a glass dish"], ["/assets/img/tree-frereana-somalia.webp", "Boswellia frereana tree growing from rock in Somalia"]],
    specs: standardSpecs([["Form", "Natural resin pieces"]]),
    seoTitle: "Boswellia Frereana Supplier | Somali Maydi Frankincense",
    seoDescription: "Boswellia frereana (Maydi) frankincense from northern Somalia. Request a wholesale quotation from Adde International.",
    translations: { so: { name: "Luubaan Maydi (Boswellia Frereana)", shortDescription: "Maydi cad oo leh ur cusub oo liin ah." }, ar: { name: "لبان (بوسويليا فريريانا)", shortDescription: "لبان ميدي فاتح اللون برائحة منعشة تشبه الليمون." } },
  },
  {
    slug: "myrrh-commiphora-myrrha", category: "myrrh", featured: true,
    name: "Myrrh (Commiphora Myrrha)", botanicalName: "Commiphora myrrha (Nees) Engl.", localName: "Malmal",
    shortDescription: "Rich, earthy and bitter-sweet natural myrrh from reddish-brown resin pieces.",
    description: "Myrrh, known in Somalia as Malmal, is the reddish-brown resin of Commiphora trees. Its deep, earthy and bitter-sweet aroma has made it valuable for incense, perfumery and traditional preparations since antiquity. Lots are supplied by agreed grade.",
    botanicalInfo: "Family Burseraceae. Commiphora myrrha is a thorny shrub or small tree of dry bushland in the Horn of Africa and Arabia.",
    grade: "Sorted grades", gradeOptions: ["Grade A", "Grade B", "Mixed"],
    gradingInfo: "Sorted according to piece size, colour and cleanliness. The meaning of each grade is confirmed in your quotation.",
    images: [["/assets/img/myrrh-amber-pieces.webp", "Reddish amber myrrh pieces on a warm background"], ["/assets/img/myrrh-glass-dish.webp", "Dark rough myrrh lumps in a glass dish"], ["/assets/img/myrrh-pile.webp", "Pile of raw myrrh resin"]],
    specs: standardSpecs([["Form", "Natural resin pieces"]]),
    seoTitle: "Somali Myrrh Exporter | Commiphora Myrrha Wholesale",
    seoDescription: "Commiphora myrrha (Malmal) resin from Somalia, supplied by grade. Request a wholesale quotation from Adde International.",
    translations: { so: { name: "Malmal (Commiphora Myrrha)", shortDescription: "Malmal dabiici ah oo leh ur qoto dheer oo dhulka ah." }, ar: { name: "المر (كوميفورا ميرها)", shortDescription: "مر طبيعي برائحة ترابية غنية وطعم حلو مر." } },
  },
  {
    slug: "frankincense-grade-a", category: "frankincense-grades", featured: true,
    name: "Frankincense Grade A", botanicalName: "Boswellia spp.",
    shortDescription: "Hand-sorted frankincense selected for larger, cleaner and more even pieces.",
    description: "A hand-sorted selection of frankincense chosen for larger, cleaner and more even pieces. Often requested by buyers whose products depend on appearance or consistency. The botanical species and exact grade definition are confirmed in each quotation.",
    botanicalInfo: "Species confirmed lot by lot. Boswellia carterii and Boswellia frereana are the principal Somali sources.",
    grade: "Grade A", gradeOptions: ["Grade A"],
    gradingInfo: "Selected from sorted lots for larger piece size, even colour and low visible debris. Grade names vary across the trade, so the criteria are written into your quotation.",
    images: [["/assets/img/resin-tears-uniform.webp", "Uniform rounded frankincense tears in a glass dish"], ["/assets/img/resin-golden-white.webp", "Golden olibanum resin pieces on white"]],
    specs: standardSpecs([["Piece size", TBC], ["Colour", TBC]]),
    seoTitle: "Frankincense Grade A | Somali Bulk Supplier",
    seoDescription: "Hand-sorted Grade A frankincense from Somalia. Request a wholesale quotation with your specification.",
    translations: { so: { name: "Luubaan Darajada A", shortDescription: "Luubaan gacan lagu kala soocay oo gabal waaweyn oo nadiif ah leh." }, ar: { name: "لبان الدرجة أ", shortDescription: "لبان مفروز يدويًا بقطع أكبر وأنظف وأكثر تجانسًا." } },
  },
  {
    slug: "frankincense-grade-b", category: "frankincense-grades",
    name: "Frankincense Grade B", botanicalName: "Boswellia spp.",
    shortDescription: "Practical sorted frankincense for distillation, extraction and incense blends.",
    description: "A practical grade of sorted frankincense, generally with smaller or more mixed pieces. Buyers commonly consider this type of grade for distillation, extraction and incense blends, where the look of each piece matters less.",
    botanicalInfo: "Species confirmed lot by lot. Boswellia carterii and Boswellia frereana are the principal Somali sources.",
    grade: "Grade B", gradeOptions: ["Grade B"],
    gradingInfo: "Typically smaller or more mixed pieces than Grade A. Grade names vary across the trade, so the criteria are written into your quotation.",
    images: [["/assets/img/resin-sack-mixed.webp", "Open sack of mixed frankincense pieces at a spice market"]],
    specs: standardSpecs([["Piece size", TBC], ["Colour", TBC]]),
    seoTitle: "Frankincense Grade B | Natural Resin Wholesale",
    seoDescription: "Sorted Grade B frankincense for extraction and incense. Request a wholesale quotation from Adde International.",
    translations: { so: { name: "Luubaan Darajada B", shortDescription: "Luubaan la kala soocay oo ku habboon soo saarista saliidda iyo foorida." }, ar: { name: "لبان الدرجة ب", shortDescription: "لبان مفروز عملي للتقطير والاستخلاص وخلطات البخور." } },
  },
  {
    // Hojari is an Omani trade name. It stays as a hidden draft until staff verify a supply.
    slug: "frankincense-premium-hojari", category: "frankincense-grades", status: "DRAFT", availability: "UNAVAILABLE",
    name: "Frankincense Premium / Hojari", botanicalName: "Boswellia sacra Flueck.",
    shortDescription: "Unpublished draft. Publish only once a verified supply has been confirmed.",
    description: "Hojari is a trade name closely associated with Boswellia sacra from Dhofar, Oman. Do not publish this listing unless the origin, species and grade of a real supply have been verified.",
    botanicalInfo: "Family Burseraceae. Origin and species must be verified before publication.",
    grade: "Premium", gradeOptions: ["Premium"],
    gradingInfo: "To be completed by staff after verification.",
    images: [["/assets/img/resin-dark-dish.webp", "Amber frankincense pieces in a metal dish on a dark background"], ["/assets/img/resin-dark-dish-close.webp", "Amber frankincense in a metal dish, seen from above"]],
    specs: standardSpecs(),
    seoTitle: "Premium Frankincense", seoDescription: "Premium frankincense.",
  },
  {
    slug: "opoponax-commiphora-guidottii", category: "other-resins", featured: false,
    name: "Opoponax (Commiphora Guidottii)", botanicalName: "Commiphora guidottii Chiov.", localName: "Habak Hadi",
    shortDescription: "Sweet, balsamic resin of the myrrh family, used in perfumery and incense.",
    description: "Opoponax, sometimes called sweet myrrh, comes from Commiphora guidottii in the Horn of Africa. Its sweet, warm and balsamic character has long been valued in perfumery and incense.",
    botanicalInfo: "Family Burseraceae. A close relative of true myrrh, native to Somalia and Ethiopia.",
    grade: "Sorted grades", gradeOptions: ["Grade A", "Grade B", "Mixed"],
    gradingInfo: "Sorted according to piece size and cleanliness. The meaning of each grade is confirmed in your quotation.",
    images: [["/assets/img/opoponax-lump.webp", "Lump of opoponax resin on a pale background"]],
    specs: standardSpecs([["Form", "Natural resin pieces"]]),
    seoTitle: "Opoponax Resin | Other Natural Resins Wholesale",
    seoDescription: "Opoponax (Commiphora guidottii) resin from the Horn of Africa. Request a wholesale quotation.",
    translations: { so: { name: "Xabag Hadi (Opoponax)", shortDescription: "Xabag macaan oo ka mid ah qoyska malmalka." }, ar: { name: "الجاوي الحلو (أوبوبوناكس)", shortDescription: "راتنج حلو وبلسمي من عائلة المر، يستخدم في العطور والبخور." } },
  },
];

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 8) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ characters) before seeding.");
  }
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Administrator", role: "SUPER_ADMIN", passwordHash: await bcrypt.hash(password, 12) },
  });

  const catIds: Record<string, string> = {};
  for (const c of categories) {
    const row = await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
    catIds[c.slug] = row.id;
  }

  for (const [i, p] of products.entries()) {
    if (await prisma.product.findUnique({ where: { slug: p.slug } })) continue;
    await prisma.product.create({
      data: {
        slug: p.slug, name: p.name, botanicalName: p.botanicalName, localName: p.localName,
        shortDescription: p.shortDescription, description: p.description, botanicalInfo: p.botanicalInfo,
        origin: p.slug.includes("hojari") ? "To be verified" : "Somalia",
        grade: p.grade, gradeOptions: p.gradeOptions, gradingInfo: p.gradingInfo,
        packagingOptions: PACKAGING, quantityOptions: QUANTITIES,
        availability: p.availability ?? "ON_REQUEST", status: p.status ?? "PUBLISHED",
        featured: p.featured ?? false, sortOrder: i, isDemo: true, verified: false,
        seoTitle: p.seoTitle, seoDescription: p.seoDescription, translations: p.translations ?? {},
        categoryId: catIds[p.category],
        images: { create: p.images.map(([url, alt], n) => ({ url, alt, sortOrder: n, isPlaceholder: true })) },
        specs: { create: p.specs.map(([label, value], n) => ({ label, value, sortOrder: n, verified: false })) },
      },
    });
  }
  console.log(`Seed complete. Admin: ${email}. Products: ${await prisma.product.count()}.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
