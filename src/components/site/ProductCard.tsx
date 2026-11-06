import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRight, Beaker, Leaf, MapPin, Package, Scale } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { PublicProduct } from "@/lib/catalog";
import { AddToCartButton } from "./AddToCartButton";
import { formatMoq, formatPrice } from "./format";

export function ProductCardCompact({ product }: { product: PublicProduct }) {
  const t = useTranslations();
  const img = product.images[0];
  return (
    <Link href={`/products/${product.slug}`} className="card group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lift">
      <div className="relative aspect-[4/3] overflow-hidden bg-sand">
        {img && <Image src={img.url} alt={img.alt} fill sizes="(min-width:1024px) 22vw, (min-width:640px) 45vw, 92vw" className="reveal-zoom object-cover" />}
        {product.isDemo && <span className="chip chip-demo absolute start-2.5 top-2.5">{t("common.sampleLabel")}</span>}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold">{product.name}</h3>
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-orange-dark text-white transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
            <ArrowRight size={15} aria-hidden className="rtl:rotate-180" />
          </span>
        </div>
        <p className="mt-2 text-sm text-muted">{product.shortDescription}</p>
      </div>
    </Link>
  );
}

export function ProductCard({ product, compareForm }: { product: PublicProduct; compareForm?: string }) {
  const t = useTranslations();
  const img = product.images[0];
  const verifiedSpecs = product.specs.filter((s) => s.verified);
  const rows = [
    { Icon: Leaf, label: t("products.botanical"), value: product.botanicalName, italic: true },
    { Icon: MapPin, label: t("products.origin"), value: product.origin },
    { Icon: Scale, label: t("products.grade"), value: product.grade },
    { Icon: Beaker, label: t("products.specifications"), value: verifiedSpecs.length ? verifiedSpecs.slice(0, 2).map((s) => `${s.label}: ${s.value}`).join("; ") : t("products.confirmOnQuote") },
    { Icon: Package, label: t("products.packaging"), value: product.isDemo || !product.packagingOptions.length ? t("products.confirmOnQuote") : product.packagingOptions.join(", ") },
    { Icon: Scale, label: t("products.moq"), value: formatMoq(product) ?? t("products.confirmOnQuote") },
  ];
  const href = `/products/${product.slug}`;
  const price = formatPrice(product);

  return (
    <article className="card group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lift">
      <Link href={href} className="relative block aspect-[16/10] overflow-hidden bg-sand" tabIndex={-1} aria-hidden>
        {img && <Image src={img.url} alt="" fill sizes="(min-width:1024px) 30vw, (min-width:640px) 46vw, 92vw" className="reveal-zoom object-cover" />}
        <span className="absolute start-2.5 top-2.5 flex flex-wrap gap-1.5">
          {product.isDemo && <span className="chip chip-demo">{t("common.sampleLabel")}</span>}
          <span className="chip bg-white/95">{t(`products.status.${product.availability}`)}</span>
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-dark">{product.category.name}</p>
        <h3 className="mt-1 text-xl font-semibold"><Link href={href} className="hover:text-orange-dark">{product.name}</Link></h3>
        <p className="mt-2 text-[15px] text-muted">{product.shortDescription}</p>
        <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
          {rows.map((r) => r.value && (
            <div key={r.label} className="grid grid-cols-[auto_1fr] items-start gap-x-2">
              <dt className="flex items-center gap-1.5 text-muted"><r.Icon size={14} aria-hidden className="shrink-0 text-orange-dark" />{r.label}:</dt>
              <dd className={`font-medium text-charcoal ${r.italic ? "italic" : ""}`}>{r.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm font-semibold text-brown">{price ?? t("products.priceOnRequest")}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <Link href={{ pathname: "/quote", query: { product: product.slug } }} className="btn btn-primary flex-1 whitespace-nowrap">{t("common.requestQuote")}</Link>
          {product.cartEnabled && (
            <AddToCartButton className="btn btn-outline flex-1 whitespace-nowrap" product={{ id: product.id, slug: product.slug, name: product.name, image: img?.url, moq: product.moq, moqUnit: product.moqUnit }} />
          )}
        </div>
        {compareForm && (
          <label className="mt-3 inline-flex min-h-6 cursor-pointer items-center gap-2 text-sm text-muted">
            <input type="checkbox" name="ids" value={product.slug} form={compareForm} className="size-4 accent-[#c9520c]" />
            {t("products.compareThis")}
          </label>
        )}
      </div>
    </article>
  );
}
