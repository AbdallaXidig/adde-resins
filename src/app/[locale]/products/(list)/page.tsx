import { getLocale, getTranslations } from "next-intl/server";
import { Info, Search, SearchX } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { filterProducts, getCategories, getPublishedProducts } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/site/PageHero";
import { ProductCard } from "@/components/site/ProductCard";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({ locale, path: "/products", title: t("productsTitle"), description: t("productsDescription"), image: "/assets/img/resin-bowl-closeup.webp" });
}

type SP = Promise<{ q?: string; category?: string; availability?: string }>;
const AVAIL = ["AVAILABLE", "ON_REQUEST", "OUT_OF_SEASON", "UNAVAILABLE"] as const;

export default async function ProductsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const t = await getTranslations("products");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const [all, categories, settings] = await Promise.all([getPublishedProducts(locale), getCategories(locale), getSettings()]);
  const filters = {
    q: typeof sp.q === "string" ? sp.q.slice(0, 100) : undefined,
    category: categories.some((c) => c.slug === sp.category) ? sp.category : undefined,
    availability: AVAIL.includes(sp.availability as never) ? sp.availability : undefined,
  };
  const products = filterProducts(all, filters);
  const showSample = settings.showSampleBanner && all.some((p) => p.isDemo);

  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} text={t("text")} image="/assets/img/resin-golden-white.webp" caption={tc("photoNote")} />
      <section className="wrap py-10 lg:py-14">
        {showSample && (
          <p className="mb-6 flex items-start gap-2.5 rounded-xl border border-[#f3c9a8] bg-[#fdf1e7] px-4 py-3 text-sm text-[#7a3407]">
            <Info size={18} aria-hidden className="mt-0.5 shrink-0" />{t("sampleBanner")}
          </p>
        )}
        <form id="search" method="get" className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end" role="search">
          <div>
            <label htmlFor="q" className="field-label">{tc("search")}</label>
            <div className="relative">
              <Search size={18} aria-hidden className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
              <input id="q" name="q" type="search" defaultValue={filters.q} placeholder={tc("searchPlaceholder")} className="field ps-10" />
            </div>
          </div>
          <div>
            <label htmlFor="category" className="field-label">{t("filterCategory")}</label>
            <select id="category" name="category" defaultValue={filters.category ?? ""} className="field">
              <option value="">{t("allCategories")}</option>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name} ({c.count})</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="availability" className="field-label">{t("filterAvailability")}</label>
            <select id="availability" name="availability" defaultValue={filters.availability ?? ""} className="field">
              <option value="">{t("anyAvailability")}</option>
              {AVAIL.map((a) => <option key={a} value={a}>{t(`status.${a}`)}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary flex-1">{t("apply")}</button>
            <Link href="/products" className="btn btn-outline">{t("reset")}</Link>
          </div>
        </form>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <p className="font-medium text-brown" aria-live="polite">{t("results", { count: products.length })}</p>
          {products.length > 1 && (
            <form id="compare-form" action={locale === "en" ? "/products/compare" : `/${locale}/products/compare`} method="get">
              <button type="submit" className="btn btn-outline min-h-10 py-2 text-sm">{t("compareSelected")}</button>
            </form>
          )}
        </div>

        {products.length === 0 ? (
          <div className="card mt-6 flex flex-col items-center px-6 py-16 text-center">
            <SearchX size={44} aria-hidden className="text-orange-dark" />
            <h2 className="mt-4 text-2xl font-semibold">{t("emptyTitle")}</h2>
            <p className="mt-2 max-w-md text-muted">{t("emptyText")}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/products" className="btn btn-outline">{t("reset")}</Link>
              <Link href="/contact" className="btn btn-primary">{tc("requestQuote")}</Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => <ProductCard key={p.id} product={p} compareForm="compare-form" />)}
          </div>
        )}
      </section>
    </>
  );
}
