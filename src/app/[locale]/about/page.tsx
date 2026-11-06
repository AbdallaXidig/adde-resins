import { getTranslations } from "next-intl/server";
import { Compass, Eye, Gem, Handshake, Scale, Sprout } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/site/PageHero";
import { CtaBand, SplitRow } from "@/components/site/ContentSections";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({ locale, path: "/about", title: t("aboutTitle"), description: t("aboutDescription"), image: "/assets/img/somalia-karin-bosaso.webp" });
}

const VALUE_ICONS = [Scale, Gem, Handshake, Sprout];

export default async function AboutPage() {
  const t = await getTranslations("about");
  const tc = await getTranslations("common");
  const values = t.raw("values") as { title: string; text: string }[];
  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} text={t("text")} image="/assets/img/somalia-karin-bosaso.webp" caption={t("captionKarin")} />
      <section className="section">
        <div className="wrap space-y-16">
          <SplitRow title={t("historyTitle")} text={t("history")} image="/assets/img/somalia-karin-trees.webp" alt="Acacia trees on red earth at Karin near Bosaso, Somalia" caption={t("captionTrees")} />
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl bg-brown p-8 text-white">
              <Compass size={30} aria-hidden className="text-gold" />
              <h2 className="mt-4 text-3xl !text-white">{t("missionTitle")}</h2>
              <p className="mt-3 text-lg text-white/85">{t("mission")}</p>
            </div>
            <div className="rounded-2xl bg-orange-dark p-8 text-white">
              <Eye size={30} aria-hidden className="text-white" />
              <h2 className="mt-4 text-3xl !text-white">{t("visionTitle")}</h2>
              <p className="mt-3 text-lg text-white/90">{t("vision")}</p>
            </div>
          </div>
        </div>
      </section>
      <section className="section bg-sand/60">
        <div className="wrap">
          <h2 className="h-section">{t("valuesTitle")}</h2>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v, i) => {
              const Icon = VALUE_ICONS[i];
              return (
                <li key={v.title} className="card p-6">
                  <Icon size={26} aria-hidden className="text-orange-dark" />
                  <h3 className="mt-3 text-xl font-semibold">{v.title}</h3>
                  <p className="mt-2 text-[15px] text-muted">{v.text}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      <section className="section">
        <div className="wrap grid gap-10 lg:grid-cols-3">
          {(["experience", "commitment", "presence"] as const).map((k) => (
            <div key={k} className="border-t-2 border-orange pt-5">
              <h2 className="text-2xl font-semibold">{t(`${k}Title`)}</h2>
              <p className="mt-3 text-muted">{t(k)}</p>
            </div>
          ))}
        </div>
      </section>
      <CtaBand title={t("cta")} primary={<Link href="/quote" className="btn btn-primary">{tc("requestQuote")}</Link>} secondary={<Link href="/contact" className="btn btn-ghost-light">{tc("learnMore")}</Link>} />
    </>
  );
}
