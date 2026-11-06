import { getTranslations } from "next-intl/server";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { getSettings, whatsappLink } from "@/lib/settings";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/site/PageHero";
import { InquiryForm } from "@/components/site/InquiryForm";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({ locale, path: "/contact", title: t("contactTitle"), description: t("contactDescription"), image: "/assets/img/somalia-bosaso-sunset.webp" });
}

export default async function ContactPage() {
  const t = await getTranslations("contact");
  const tc = await getTranslations("common");
  const s = await getSettings();
  const items = [
    { Icon: Mail, label: tc("email"), value: s.email, href: `mailto:${s.email}` },
    { Icon: Phone, label: tc("phone"), value: s.phone, href: `tel:${s.phone.replace(/\s/g, "")}`, ltr: true },
    { Icon: MessageCircle, label: tc("whatsapp"), value: tc("chatWhatsapp"), href: whatsappLink(s.whatsapp), external: true },
    { Icon: MapPin, label: t("location"), value: s.location },
    { Icon: Clock, label: t("hours"), value: s.hours },
  ];
  return (
    <>
      <PageHero eyebrow={t("eyebrow")} title={t("title")} text={t("text")} image="/assets/img/somalia-bosaso-sunset.webp" caption="Bosaso, Somalia" />
      <section className="section">
        <div className="wrap grid gap-10 lg:grid-cols-[1fr_1.7fr]">
          <div>
            <h2 className="text-2xl font-semibold">{t("details")}</h2>
            <ul className="mt-5 space-y-3">
              {items.map(({ Icon, label, value, href, external, ltr }) => (
                <li key={label} className="card flex items-start gap-4 p-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-orange/10 text-orange-dark"><Icon size={20} aria-hidden /></span>
                  <div>
                    <p className="text-sm text-muted">{label}</p>
                    {href ? (
                      <a href={href} dir={ltr ? "ltr" : undefined} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="font-semibold text-brown hover:text-orange-dark">{value}</a>
                    ) : <p className="font-semibold text-brown">{value}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-6 sm:p-8">
            <h2 className="mb-5 text-2xl font-semibold">{t("formTitle")}</h2>
            <InquiryForm />
          </div>
        </div>
      </section>
    </>
  );
}
