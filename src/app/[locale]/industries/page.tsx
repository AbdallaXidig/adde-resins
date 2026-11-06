import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/site/PageHero";
import { CtaBand } from "@/components/site/ContentSections";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({ locale, path: "/industries", title: t("industriesTitle"), description: t("industriesDescription"), image: "/assets/img/industry-perfume.webp" });
}

const IMAGES = [
  ["industry-pharma", "Brass pharmacy mortar and pestle"],
  ["industry-nutra", "Bowls of Boswellia and botanical ingredients on dark wood"],
  ["industry-perfume", "Amber perfume bottles arranged on a table"],
  ["industry-aromatherapy", "Amber essential oil dropper bottle with herbs"],
  ["industry-cosmetics", "Natural powder container on a marble surface"],
  ["industry-incense", "Hands placing incense in a burner with rising smoke"],
  ["industry-manufacturers", "Laboratory cylinders of natural oils in amber tones"],
];

export default async function IndustriesPage() {
  const t = await getTranslations("industries");
  const tc = await getTranslations("common");
  const items = t.raw("items") as { title: string; text: string }[];
  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} text={t("text")} image="/assets/img/industry-nutra.webp" caption={tc("photoNote")} />
      <section className="section">
        <div className="wrap grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it, i) => (
            <article key={it.title} id={`industry-${i + 1}`} className="card group overflow-hidden">
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image src={`/assets/img/${IMAGES[i][0]}.webp`} alt={IMAGES[i][1]} fill sizes="(min-width:1024px) 30vw, (min-width:640px) 45vw, 100vw" className="reveal-zoom object-cover" />
              </div>
              <div className="p-6">
                <h2 className="text-2xl font-semibold">{it.title}</h2>
                <p className="mt-2 text-muted">{it.text}</p>
              </div>
            </article>
          ))}
        </div>
        <p className="wrap mt-10 text-sm text-muted">{t("disclaimer")}</p>
      </section>
      <CtaBand title={t("cta")} primary={<Link href="/quote" className="btn btn-primary">{tc("requestQuote")}</Link>} secondary={<Link href="/contact" className="btn btn-ghost-light">{tc("learnMore")}</Link>} />
    </>
  );
}
