import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getPublishedProducts } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";
import { formatMoq, formatPrice } from "@/components/site/format";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({ locale, path: "/products/compare", title: t("compareTitle"), description: t("productsDescription") });
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string | string[] }> }) {
  const sp = await searchParams;
  const t = await getTranslations();
  const locale = await getLocale();
  const all = await getPublishedProducts(locale);
  const ids = (Array.isArray(sp.ids) ? sp.ids : sp.ids ? [sp.ids] : []).slice(0, 4);
  const chosen = ids.length ? all.filter((p) => ids.includes(p.slug)) : all.filter((p) => p.featured).slice(0, 3);

  const rows: [string, (p: (typeof all)[number]) => React.ReactNode][] = [
    [t("products.botanical"), (p) => <i>{p.botanicalName}</i>],
    [t("products.localName"), (p) => p.localName ?? "—"],
    [t("products.origin"), (p) => p.origin ?? "—"],
    [t("products.grade"), (p) => p.gradeOptions.join(", ") || p.grade || "—"],
    [t("products.availability"), (p) => t(`products.status.${p.availability}`)],
    [t("products.moq"), (p) => formatMoq(p) ?? t("products.confirmOnQuote")],
    [t("products.packaging"), (p) => (p.isDemo ? t("products.confirmOnQuote") : p.packagingOptions.join(", ") || "—")],
    [t("products.price"), (p) => formatPrice(p) ?? t("products.priceOnRequest")],
  ];

  return (
    <section className="wrap py-10 lg:py-14">
      <p className="eyebrow">{t("compare.eyebrow")}</p>
      <h1 className="h-display mt-3">{t("compare.title")}</h1>
      <p className="mt-3 max-w-2xl text-muted">{t("compare.text")}</p>

      <form method="get" className="card mt-6 p-4">
        <fieldset>
          <legend className="field-label">{t("compare.choose")}</legend>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            {all.map((p) => (
              <label key={p.id} className="inline-flex min-h-8 items-center gap-2 text-sm">
                <input type="checkbox" name="ids" value={p.slug} defaultChecked={chosen.some((c) => c.id === p.id)} className="size-4 accent-[#c9520c]" />{p.name}
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" className="btn btn-primary mt-4">{t("compare.update")}</button>
      </form>

      {chosen.length < 2 ? (
        <p className="card mt-6 p-8 text-center text-muted">{t("compare.empty")}</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr>
                <th scope="col" className="w-40 p-4 text-start align-bottom text-muted">{t("compare.feature")}</th>
                {chosen.map((p) => (
                  <th key={p.id} scope="col" className="p-4 text-start align-top">
                    <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-lg bg-sand">
                      {p.images[0] && <Image src={p.images[0].url} alt={p.images[0].alt} fill sizes="240px" className="object-cover" />}
                    </div>
                    <Link href={`/products/${p.slug}`} className="font-serif text-lg text-brown hover:text-orange-dark">{p.name}</Link>
                    {p.isDemo && <span className="chip chip-demo ms-2 align-middle">{t("common.sampleLabel")}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, render]) => (
                <tr key={label} className="border-t border-line">
                  <th scope="row" className="p-4 text-start font-medium text-muted">{label}</th>
                  {chosen.map((p) => <td key={p.id} className="p-4">{render(p)}</td>)}
                </tr>
              ))}
              <tr className="border-t border-line">
                <td />
                {chosen.map((p) => (
                  <td key={p.id} className="p-4"><Link href={{ pathname: "/quote", query: { product: p.slug } }} className="btn btn-primary min-h-10 w-full py-2 text-sm">{t("common.requestQuote")}</Link></td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
