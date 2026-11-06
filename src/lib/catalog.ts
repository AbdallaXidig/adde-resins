import "server-only";
import { unstable_cache } from "next/cache";
import type { Availability, Prisma } from "@prisma/client";
import { prisma } from "./db";

const include = {
  category: true,
  images: { orderBy: { sortOrder: "asc" } },
  specs: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.ProductInclude;

type Row = Prisma.ProductGetPayload<{ include: typeof include }>;
type Translation = Partial<Record<"name" | "shortDescription" | "description" | "botanicalInfo" | "gradingInfo", string>>;

export type PublicProduct = {
  id: string;
  slug: string;
  name: string;
  botanicalName: string | null;
  localName: string | null;
  shortDescription: string;
  description: string;
  botanicalInfo: string | null;
  origin: string | null;
  grade: string | null;
  gradeOptions: string[];
  gradingInfo: string | null;
  packagingOptions: string[];
  quantityOptions: string[];
  moq: number | null;
  moqUnit: "KG" | "MT";
  price: number | null;
  currency: string;
  availability: Availability;
  cartEnabled: boolean;
  featured: boolean;
  isDemo: boolean;
  verified: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: string;
  category: { slug: string; name: string };
  images: { url: string; alt: string; isPlaceholder: boolean }[];
  specs: { label: string; value: string; verified: boolean }[];
};

function toPublic(p: Row, locale: string): PublicProduct {
  const t = ((p.translations as Record<string, Translation>) ?? {})[locale] ?? {};
  const ct = ((p.category.translations as Record<string, { name?: string }>) ?? {})[locale] ?? {};
  return {
    id: p.id,
    slug: p.slug,
    name: t.name || p.name,
    botanicalName: p.botanicalName,
    localName: p.localName,
    shortDescription: t.shortDescription || p.shortDescription,
    description: t.description || p.description,
    botanicalInfo: t.botanicalInfo || p.botanicalInfo,
    origin: p.origin,
    grade: p.grade,
    gradeOptions: p.gradeOptions,
    gradingInfo: t.gradingInfo || p.gradingInfo,
    packagingOptions: p.packagingOptions,
    quantityOptions: p.quantityOptions,
    moq: p.moq === null ? null : Number(p.moq),
    moqUnit: p.moqUnit,
    // The price itself is withheld from the page unless staff have chosen to publish it.
    price: p.priceVisible && p.pricePerKg !== null ? Number(p.pricePerKg) : null,
    currency: p.currency,
    availability: p.availability,
    cartEnabled: p.cartEnabled && p.availability !== "UNAVAILABLE",
    featured: p.featured,
    isDemo: p.isDemo,
    verified: p.verified,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    updatedAt: p.updatedAt.toISOString(),
    category: { slug: p.category.slug, name: ct.name || p.category.name },
    images: p.images.map((i) => ({ url: i.url, alt: i.alt, isPlaceholder: i.isPlaceholder })),
    specs: p.specs.map((s) => ({ label: s.label, value: s.value, verified: s.verified })),
  };
}

export const getPublishedProducts = unstable_cache(
  async (locale: string): Promise<PublicProduct[]> => {
    const rows = await prisma.product.findMany({
      where: { status: "PUBLISHED" },
      include,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return rows.map((r) => toPublic(r, locale));
  },
  ["published-products"],
  { tags: ["catalog"], revalidate: 300 },
);

export const getCategories = unstable_cache(
  async (locale: string) => {
    const rows = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: { where: { status: "PUBLISHED" } } } } },
    });
    return rows
      .filter((c) => c._count.products > 0)
      .map((c) => {
        const t = ((c.translations as Record<string, { name?: string; description?: string }>) ?? {})[locale] ?? {};
        return { slug: c.slug, name: t.name || c.name, description: t.description || c.description, count: c._count.products };
      });
  },
  ["categories"],
  { tags: ["catalog"], revalidate: 300 },
);

export async function getProductBySlug(slug: string, locale: string) {
  const all = await getPublishedProducts(locale);
  return all.find((p) => p.slug === slug) ?? null;
}

export type CatalogFilters = { q?: string; category?: string; availability?: string };

export function filterProducts(products: PublicProduct[], f: CatalogFilters) {
  const q = f.q?.trim().toLowerCase();
  return products.filter((p) => {
    if (f.category && p.category.slug !== f.category) return false;
    if (f.availability && p.availability !== f.availability) return false;
    if (q) {
      const hay = [p.name, p.botanicalName, p.localName, p.grade, p.shortDescription, p.category.name].join(" ").toLowerCase();
      if (!q.split(/\s+/).every((word) => hay.includes(word))) return false;
    }
    return true;
  });
}
