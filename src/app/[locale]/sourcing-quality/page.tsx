import { getTranslations } from "next-intl/server";
import { Info } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/site/PageHero";
import { CtaBand, SplitRow } from "@/components/site/ContentSections";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({ locale, path: "/sourcing-quality", title: t("sourcingTitle"), description: t("sourcingDescription"), image: "/assets/img/somalia-golis-road.webp" });
}

export default async function SourcingPage() {
  const t = await getTranslations("sourcing");
  const tc = await getTranslations("common");
  const s = t.raw("sections") as { title: string; text: string }[];
  // Each pair of sections shares a photo; captions say honestly where each photo was taken.
  const rows = [
    { a: 0, b: 1, image: "/assets/img/somalia-golis-road.webp", alt: "Road winding through the Golis mountains of northern Somalia", caption: t("captionGolis") },
    { a: 2, b: 3, image: "/assets/img/tree-resin-on-bark.webp", alt: "White frankincense resin beads forming on Boswellia bark", caption: t("captionBark") },
    { a: 4, b: 5, image: "/assets/img/resin-grey-bowl.webp", alt: "Boswellia resin in a grey stone bowl", caption: t("captionGrading") },
    { a: 6, b: 7, image: "/assets/img/tree-boswellia-landscape.webp", alt: "Boswellia sacra frankincense tree in open arid landscape", caption: t("captionTree") },
  ];
  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} text={t("text")} image="/assets/img/tree-papery-bark.webp" caption={tc("photoNote")} />
      <section className="section">
        <div className="wrap space-y-16 lg:space-y-24">
          {rows.map((r, i) => (
            <SplitRow key={r.a} title={s[r.a].title} text={s[r.a].text} image={r.image} alt={r.alt} caption={r.caption} flip={i % 2 === 1}>
              <h3 className="mt-8 text-2xl font-semibold">{s[r.b].title}</h3>
              <p className="mt-3 text-muted">{s[r.b].text}</p>
            </SplitRow>
          ))}
          <figure className="card mx-auto flex max-w-3xl flex-col items-center gap-5 overflow-hidden p-5 sm:flex-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/img/tree-frereana-somalia.webp" alt="Boswellia frereana tree growing from rock in Somalia" loading="lazy" className="h-60 w-auto rounded-lg object-cover" width={672} height={1032} />
            <figcaption>
              <p className="font-serif text-xl text-brown">{t("captionFrereana")}</p>
              <p className="mt-2 text-sm text-muted">{s[1].text}</p>
            </figcaption>
          </figure>
          <p className="mx-auto flex max-w-3xl gap-2.5 rounded-xl bg-sand px-4 py-3 text-sm text-muted">
            <Info size={18} aria-hidden className="mt-0.5 shrink-0" /><span>{t("notice")} <Link href="/image-credits" className="underline">{tc("photoNote")}</Link></span>
          </p>
        </div>
      </section>
      <CtaBand title={t("cta")} primary={<Link href="/quote" className="btn btn-primary">{tc("requestQuote")}</Link>} />
    </>
  );
}
