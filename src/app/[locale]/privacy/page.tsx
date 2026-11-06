import { getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({ locale, path: "/privacy", title: t("privacyTitle"), description: t("privacyTitle") });
}

export default async function PrivacyPage() {
  const t = await getTranslations("privacy");
  return (
    <section className="wrap max-w-3xl py-10 lg:py-14">
      <h1 className="h-display">{t("title")}</h1>
      {(t.raw("sections") as { title: string; text: string }[]).map((s) => (
        <div key={s.title} className="mt-8"><h2 className="text-2xl font-semibold">{s.title}</h2><p className="mt-2 text-muted">{s.text}</p></div>
      ))}
    </section>
  );
}
