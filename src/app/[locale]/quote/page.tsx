import { getLocale, getTranslations } from "next-intl/server";
import { Mail, MessageCircle } from "lucide-react";
import { getPublishedProducts } from "@/lib/catalog";
import { getSettings, whatsappLink } from "@/lib/settings";
import { pageMetadata } from "@/lib/seo";
import { QuoteForm } from "@/components/site/QuoteForm";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({ locale, path: "/quote", title: t("quoteTitle"), description: t("quoteDescription") });
}

export default async function QuotePage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const { product } = await searchParams;
  const t = await getTranslations("quote");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const [products, s] = await Promise.all([getPublishedProducts(locale), getSettings()]);
  return (
    <section className="wrap py-10 lg:py-14">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1 className="h-display mt-3">{t("title")}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">{t("text")}</p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.7fr_1fr]">
        <div className="card p-6 sm:p-8">
          <QuoteForm initialSlug={typeof product === "string" ? product : undefined}
            products={products.map((p) => ({ id: p.id, slug: p.slug, name: p.name, gradeOptions: p.gradeOptions, packagingOptions: p.packagingOptions, isDemo: p.isDemo }))} />
        </div>
        <aside className="space-y-5">
          <div className="rounded-2xl bg-brown p-6 text-white">
            <h2 className="text-2xl !text-white">{t("sideTitle")}</h2>
            <ol className="mt-4 space-y-3">
              {(t.raw("steps") as string[]).map((s, i) => (
                <li key={s} className="flex gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-orange-dark text-sm font-bold">{i + 1}</span><span className="text-white/90">{s}</span></li>
              ))}
            </ol>
          </div>
          <div className="card p-6">
            <h2 className="text-xl font-semibold">{t("sideContact")}</h2>
            <div className="mt-4 flex flex-col gap-2.5">
              <a href={whatsappLink(s.whatsapp)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp"><MessageCircle size={18} aria-hidden />{tc("chatWhatsapp")}</a>
              <a href={`mailto:${s.email}`} className="btn btn-outline"><Mail size={18} aria-hidden />{s.email}</a>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
