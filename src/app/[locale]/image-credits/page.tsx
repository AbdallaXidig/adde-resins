import { getTranslations } from "next-intl/server";
import credits from "@/data/image-credits.json";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({ locale, path: "/image-credits", title: t("creditsTitle"), description: t("creditsTitle") });
}

export default async function CreditsPage() {
  const t = await getTranslations("credits");
  const tc = await getTranslations("common");
  return (
    <section className="wrap py-10 lg:py-14">
      <h1 className="h-display">{t("title")}</h1>
      <p className="mt-3 max-w-3xl text-muted">{t("text")}</p>
      <div className="mt-8 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-sand/60 text-start">
            <tr>{[t("photo"), t("author"), t("licence"), t("location"), t("source")].map((h) => <th key={h} scope="col" className="p-3 text-start font-semibold text-brown">{h}</th>)}</tr>
          </thead>
          <tbody>
            {credits.map((c) => (
              <tr key={c.key} className="border-t border-line align-top">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.file} alt={c.alt} loading="lazy" width={64} height={48} className="h-12 w-16 shrink-0 rounded object-cover" />
                    <span>{c.title}{c.replaceWithCompanyPhoto && <span className="mt-1 block text-xs text-muted">{tc("stockPhoto")}</span>}</span>
                  </div>
                </td>
                <td className="p-3">{c.author}</td>
                <td className="p-3">{c.licenceUrl ? <a href={c.licenceUrl} target="_blank" rel="noopener noreferrer license" className="underline">{c.licence}</a> : c.licence}</td>
                <td className="p-3">{c.location}</td>
                <td className="p-3"><a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{c.source}</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
