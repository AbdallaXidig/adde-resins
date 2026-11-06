import { getTranslations } from "next-intl/server";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getSettings, whatsappLink } from "@/lib/settings";

export const metadata = { robots: { index: false } };

export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  const t = await getTranslations("confirmation");
  const tc = await getTranslations("common");
  const s = await getSettings();
  const valid = typeof ref === "string" && /^ADI-(RFQ|ORD|INQ)-\d{4}-\d{5,}$/.test(ref);
  return (
    <section className="wrap py-14 lg:py-20">
      <div className="card mx-auto max-w-2xl p-8 text-center sm:p-12">
        {valid ? (
          <>
            <CheckCircle2 size={56} aria-hidden className="mx-auto text-[#1d7a3a]" />
            <h1 className="mt-5 text-[clamp(1.6rem,1.2rem+1.6vw,2.25rem)] font-semibold">{t("title")}</h1>
            <p className="mt-3 text-muted">{t("text")}</p>
            <div className="mx-auto mt-6 inline-block rounded-xl border-2 border-dashed border-orange bg-[#fdf6f0] px-6 py-4">
              <p className="text-sm text-muted">{t("reference")}</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-wide text-brown" dir="ltr" data-testid="reference">{ref}</p>
            </div>
            <p className="mx-auto mt-6 max-w-md text-[15px]">{t("next")}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <a className="btn btn-whatsapp" href={whatsappLink(s.whatsapp, t("whatsappText", { ref }))} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} aria-hidden />{tc("chatWhatsapp")}</a>
              <Link href="/products" className="btn btn-outline">{t("browse")}</Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">{t("invalid")}</h1>
            <Link href="/" className="btn btn-primary mt-6">{t("backHome")}</Link>
          </>
        )}
      </div>
    </section>
  );
}
