import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { routing } from "@/i18n/routing";
import { localePath, siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

const STATIC = ["/", "/products", "/products/compare", "/services", "/sourcing-quality", "/industries", "/about", "/contact", "/quote", "/image-credits", "/privacy"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await prisma.product.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }).catch(() => []);
  const entries = [
    ...STATIC.map((path) => ({ path, lastModified: new Date(), priority: path === "/" ? 1 : 0.7 })),
    ...products.map((p) => ({ path: `/products/${p.slug}`, lastModified: p.updatedAt, priority: 0.8 })),
  ];
  return entries.map(({ path, lastModified, priority }) => ({
    url: `${siteUrl()}${localePath(routing.defaultLocale, path)}`,
    lastModified,
    priority,
    alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, `${siteUrl()}${localePath(l, path)}`])) },
  }));
}
