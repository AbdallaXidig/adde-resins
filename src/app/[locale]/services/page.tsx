import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Boxes, ClipboardCheck, FileText, Globe2, Layers, PackageOpen, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/site/PageHero";
import { CtaBand } from "@/components/site/ContentSections";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({ locale, path: "/services", title: t("servicesTitle"), description: t("servicesDescription"), image: "/assets/img/logistics-terminal-sunset.webp" });
}

const ICONS = [Search, Boxes, Globe2, Layers, PackageOpen, ClipboardCheck, FileText];

export default async function ServicesPage() {
  const t = await getTranslations("services");
  const tc = await getTranslations("common");
  const items = t.raw("items") as { title: string; text: string }[];
  const steps = t.raw("process") as { title: string; text: string }[];
  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} text={t("text")} image="/assets/img/logistics-terminal-sunset.webp" caption={tc("photoNote")} />
      <section className="section">
        <div className="wrap grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s, i) => {
            const Icon = ICONS[i] ?? Boxes;
            return (
              <article key={s.title} id={`service-${i + 1}`} className={`card p-7 transition-transform hover:-translate-y-1 ${i === items.length - 1 ? "lg:col-span-2" : ""}`}>
                <span className="grid size-12 place-items-center rounded-xl bg-orange/10 text-orange-dark"><Icon size={24} aria-hidden /></span>
                <h2 className="mt-4 text-2xl font-semibold">{s.title}</h2>
                <p className="mt-2 text-muted">{s.text}</p>
              </article>
            );
          })}
          <div className="relative min-h-60 overflow-hidden rounded-[0.875rem] shadow-card lg:col-span-1">
            <Image src="/assets/img/packaging-sacks.webp" alt="Open woven sacks of natural dry goods" fill sizes="(min-width:1024px) 30vw, 100vw" className="object-cover" />
            <span className="absolute bottom-2 start-2 rounded bg-black/60 px-2 py-0.5 text-[11px] text-white">{tc("photoNote")}</span>
          </div>
        </div>
      </section>
      <section className="section bg-sand/60">
        <div className="wrap">
          <h2 className="h-section">{t("processTitle")}</h2>
          <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="relative rounded-xl border border-line bg-white p-6">
                <span className="font-serif text-5xl font-semibold text-orange/30">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
                <p className="mt-1 text-[15px] text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="relative h-72 overflow-hidden lg:h-96">
        <Image src="/assets/img/logistics-ship-sea.webp" alt="Container ship at sea" fill sizes="100vw" className="object-cover" />
        <span className="absolute bottom-2 end-2 rounded bg-black/60 px-2 py-0.5 text-[11px] text-white">{tc("photoNote")}</span>
      </section>
      <CtaBand title={t("cta")} primary={<Link href="/quote" className="btn btn-primary">{tc("requestQuote")}</Link>} secondary={<Link href="/contact" className="btn btn-ghost-light">{tc("learnMore")}</Link>} />
    </>
  );
}
