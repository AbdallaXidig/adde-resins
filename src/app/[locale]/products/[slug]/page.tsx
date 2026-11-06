import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronRight, Info, MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getProductBySlug, getPublishedProducts } from "@/lib/catalog";
import { getSettings, whatsappLink } from "@/lib/settings";
import { localePath, pageMetadata, siteUrl } from "@/lib/seo";
import { ProductGallery } from "@/components/site/ProductGallery";
import { ProductCardCompact } from "@/components/site/ProductCard";
import { AddToCartButton } from "@/components/site/AddToCartButton";
import { QuoteForm } from "@/components/site/QuoteForm";
import { formatMoq, formatPrice } from "@/components/site/format";

type Params = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { locale, slug } = await params;
  const p = await getProductBySlug(slug, locale);
  if (!p) notFound(); // before streaming starts, so unpublished products return a real 404
  return pageMetadata({
    locale, path: `/products/${p.slug}`,
    title: p.seoTitle || p.name,
    description: p.seoDescription || p.shortDescription,
    image: p.images[0]?.url,
  });
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const locale = await getLocale();
  const product = await getProductBySlug(slug, locale);
  if (!product) notFound();
  const t = await getTranslations();
  const [all, settings] = await Promise.all([getPublishedProducts(locale), getSettings()]);
  const related = all.filter((p) => p.id !== product.id && p.category.slug === product.category.slug)
    .concat(all.filter((p) => p.id !== product.id && p.category.slug !== product.category.slug)).slice(0, 4);
  const price = formatPrice(product);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((i) => `${siteUrl()}${i.url}`),
    category: product.category.name,
    brand: { "@type": "Brand", name: "Adde International" },
    countryOfOrigin: product.origin ?? undefined,
    url: `${siteUrl()}${localePath(locale, `/products/${product.slug}`)}`,
    // An Offer is only listed when a real price has been published by staff.
    ...(product.price !== null && {
      offers: { "@type": "Offer", price: product.price, priceCurrency: product.currency, priceSpecification: { "@type": "UnitPriceSpecification", price: product.price, priceCurrency: product.currency, unitCode: "KGM" } },
    }),
  };

  const section = "border-t border-line pt-7";
  return (
    <>
      <nav aria-label="Breadcrumb" className="wrap flex flex-wrap items-center gap-1.5 pt-6 text-sm text-muted">
        <Link href="/" className="hover:text-orange-dark">{t("common.home")}</Link><ChevronRight size={14} aria-hidden className="rtl:rotate-180" />
        <Link href="/products" className="hover:text-orange-dark">{t("nav.products")}</Link><ChevronRight size={14} aria-hidden className="rtl:rotate-180" />
        <span aria-current="page" className="text-brown">{product.name}</span>
      </nav>

      <section className="wrap grid gap-10 py-8 lg:grid-cols-2 lg:gap-14">
        <div>
          <ProductGallery images={product.images} name={product.name} />
          {product.images.some((i) => i.isPlaceholder) && <p className="mt-3 text-xs text-muted">{t("product.photoNote")}</p>}
        </div>
        <div>
          <div className="flex flex-wrap gap-2">
            <span className="chip">{product.category.name}</span>
            <span className="chip">{t(`products.status.${product.availability}`)}</span>
            {product.isDemo && <span className="chip chip-demo">{t("common.sampleLabel")}</span>}
          </div>
          <h1 className="mt-3 text-[clamp(1.9rem,1.4rem+2vw,2.75rem)] font-semibold">{product.name}</h1>
          {product.botanicalName && <p className="mt-1 text-lg italic text-muted">{product.botanicalName}</p>}
          <p className="mt-4 text-lg">{product.shortDescription}</p>

          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line text-sm">
            {[
              [t("products.origin"), product.origin],
              [t("products.grade"), product.grade],
              [t("products.localName"), product.localName],
              [t("products.moq"), formatMoq(product) ?? t("products.confirmOnQuote")],
              [t("products.price"), price ?? t("products.priceOnRequest")],
              [t("products.availability"), t(`products.status.${product.availability}`)],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="bg-white px-4 py-3"><dt className="text-muted">{k}</dt><dd className="mt-0.5 font-semibold text-brown">{v}</dd></div>
            ))}
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#quote" className="btn btn-primary">{t("common.requestQuote")}</a>
            {product.cartEnabled ? (
              <AddToCartButton product={{ id: product.id, slug: product.slug, name: product.name, image: product.images[0]?.url, moq: product.moq, moqUnit: product.moqUnit }} />
            ) : null}
            <a className="btn btn-whatsapp" target="_blank" rel="noopener noreferrer" href={whatsappLink(settings.whatsapp, t("product.whatsappText", { product: product.name }))}>
              <MessageCircle size={18} aria-hidden />{t("product.askWhatsapp")}
            </a>
          </div>
          {!product.cartEnabled && <p className="mt-3 text-sm text-muted">{t("product.unavailableNote")}</p>}
        </div>
      </section>

      <section className="wrap grid gap-10 pb-6 lg:grid-cols-[1.5fr_1fr] lg:gap-14">
        <div className="space-y-7">
          <div><h2 className="text-2xl font-semibold">{t("product.overview")}</h2><p className="mt-3 whitespace-pre-line text-[17px]">{product.description}</p></div>
          {product.botanicalInfo && <div className={section}><h2 className="text-2xl font-semibold">{t("product.botanicalInfo")}</h2><p className="mt-3 whitespace-pre-line">{product.botanicalInfo}</p></div>}
          {product.gradingInfo && <div className={section}><h2 className="text-2xl font-semibold">{t("product.grading")}</h2><p className="mt-3 whitespace-pre-line">{product.gradingInfo}</p>
            {product.gradeOptions.length > 0 && <p className="mt-3 flex flex-wrap gap-2">{product.gradeOptions.map((g) => <span key={g} className="chip">{g}</span>)}</p>}</div>}
        </div>
        <aside className="space-y-6">
          <div className="card p-5">
            <h2 className="text-xl font-semibold">{t("product.qualitySpecs")}</h2>
            <table className="mt-3 w-full text-sm">
              <tbody>
                {product.specs.map((s) => (
                  <tr key={s.label} className="border-b border-line last:border-0">
                    <th scope="row" className="py-2.5 pe-3 text-start font-medium text-muted">{s.label}</th>
                    <td className="py-2.5 font-semibold text-brown">{s.verified ? s.value : <span className="font-normal italic text-muted">{s.value === "To be confirmed" ? t("products.toBeConfirmed") : s.value}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 flex gap-2 text-xs text-muted"><Info size={14} aria-hidden className="mt-0.5 shrink-0" />{t("product.specNote")}</p>
          </div>
          <div className="card p-5">
            <h2 className="text-xl font-semibold">{t("product.packagingOptions")}</h2>
            <ul className="mt-2 list-disc space-y-1 ps-5 text-sm">
              {product.isDemo || product.packagingOptions.length === 0
                ? <li>{t("products.confirmOnQuote")}</li>
                : product.packagingOptions.map((p) => <li key={p}>{p}</li>)}
            </ul>
            <h2 className="mt-5 text-xl font-semibold">{t("product.quantities")}</h2>
            <ul className="mt-2 list-disc space-y-1 ps-5 text-sm">{product.quantityOptions.map((q) => <li key={q}>{q}</li>)}</ul>
          </div>
        </aside>
      </section>

      <section id="quote" className="scroll-mt-28 bg-sand/60 py-12 lg:py-16">
        <div className="wrap grid gap-8 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <h2 className="h-section">{t("product.inquiryTitle")}</h2>
            <p className="mt-3 text-muted">{t("product.inquiryText")}</p>
          </div>
          <div className="card p-6 sm:p-8">
            <QuoteForm initialSlug={product.slug} products={all.map((p) => ({ id: p.id, slug: p.slug, name: p.name, gradeOptions: p.gradeOptions, packagingOptions: p.packagingOptions, isDemo: p.isDemo }))} />
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="wrap py-12 lg:py-16">
          <h2 className="h-section">{t("product.related")}</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{related.map((p) => <ProductCardCompact key={p.id} product={p} />)}</div>
        </section>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
