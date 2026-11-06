import { getTranslations } from "next-intl/server";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getSettings, whatsappLink } from "@/lib/settings";
import { Logo } from "./Logo";

export async function Footer() {
  const t = await getTranslations();
  const s = await getSettings();
  const head = "mb-3 font-serif text-lg text-white";
  const link = "block py-1 text-[15px] text-white/80 hover:text-gold";
  const socials = [["LinkedIn", s.linkedin], ["Facebook", s.facebook], ["YouTube", s.youtube]].filter(([, url]) => url);

  return (
    <footer className="bg-brown text-white print:hidden">
      <div className="wrap grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
        <div>
          <div className="inline-block rounded-lg bg-white p-2.5"><Logo className="h-14 w-auto" /></div>
          <p className="mt-4 max-w-sm text-[15px] text-white/80">{t("footer.about")}</p>
          {socials.length > 0 && (
            <p className="mt-4 flex flex-wrap gap-4 text-sm">
              {socials.map(([name, url]) => <a key={name} href={url} rel="noopener noreferrer" target="_blank" className="underline hover:text-gold">{name}</a>)}
            </p>
          )}
        </div>
        <div>
          <h2 className={head}>{t("footer.explore")}</h2>
          <Link className={link} href="/products">{t("nav.products")}</Link>
          <Link className={link} href="/services">{t("nav.services")}</Link>
          <Link className={link} href="/sourcing-quality">{t("nav.sourcing")}</Link>
          <Link className={link} href="/industries">{t("nav.industries")}</Link>
          <Link className={link} href="/about">{t("nav.about")}</Link>
        </div>
        <div>
          <h2 className={head}>{t("footer.buyers")}</h2>
          <Link className={link} href="/quote">{t("common.requestQuote")}</Link>
          <Link className={link} href="/products/compare">{t("nav.compare")}</Link>
          <Link className={link} href="/cart">{t("common.cart")}</Link>
          <Link className={link} href="/contact">{t("nav.contact")}</Link>
        </div>
        <div>
          <h2 className={head}>{t("footer.contact")}</h2>
          <ul className="space-y-2.5 text-[15px] text-white/85">
            <li className="flex gap-2.5"><MapPin size={17} aria-hidden className="mt-1 shrink-0 text-gold" />{s.location}</li>
            <li className="flex gap-2.5"><Mail size={17} aria-hidden className="mt-1 shrink-0 text-gold" /><a className="hover:text-gold" href={`mailto:${s.email}`}>{s.email}</a></li>
            <li className="flex gap-2.5"><Phone size={17} aria-hidden className="mt-1 shrink-0 text-gold" /><a className="hover:text-gold" dir="ltr" href={`tel:${s.phone.replace(/\s/g, "")}`}>{s.phone}</a></li>
            <li className="flex gap-2.5"><MessageCircle size={17} aria-hidden className="mt-1 shrink-0 text-gold" /><a className="hover:text-gold" href={whatsappLink(s.whatsapp)} target="_blank" rel="noopener noreferrer">{t("common.chatWhatsapp")}</a></li>
            <li className="flex gap-2.5"><Clock size={17} aria-hidden className="mt-1 shrink-0 text-gold" />{s.hours}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/15">
        <div className="wrap flex flex-col gap-2 py-5 text-[13px] text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {s.companyName} {t("footer.rights")}</p>
          <p className="flex gap-5">
            <Link href="/image-credits" className="hover:text-gold">{t("footer.credits")}</Link>
            <Link href="/privacy" className="hover:text-gold">{t("footer.privacy")}</Link>
            <a href="/admin/login" className="hover:text-gold" rel="nofollow">{t("footer.staff")}</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
