import { getTranslations } from "next-intl/server";
import { Mail, MapPin, Phone, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getSettings } from "@/lib/settings";
import { getCategories } from "@/lib/catalog";
import { getLocale } from "next-intl/server";
import { Logo } from "./Logo";
import { CartLink } from "./CartLink";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileNav } from "./MobileNav";
import { NavLinks } from "./NavLinks";

export async function Header() {
  const t = await getTranslations();
  const locale = await getLocale();
  const [s, categories] = await Promise.all([getSettings(), getCategories(locale)]);
  const cats = categories.map((c) => ({ slug: c.slug, name: c.name }));

  return (
    <header className="sticky top-0 z-40 bg-white shadow-[0_1px_0_rgb(64_35_19/10%)]">
      <div className="hidden bg-brown text-[13px] text-white md:block">
        <div className="wrap flex h-9 items-center justify-between gap-6">
          <p className="flex items-center gap-4 truncate">
            <span className="inline-flex items-center gap-1.5"><MapPin size={14} aria-hidden className="text-gold" />{s.location}</span>
            <span className="hidden border-s border-white/30 ps-4 xl:inline">{t("common.tagline")}</span>
          </p>
          <div className="flex items-center gap-5">
            <LocaleSwitcher />
            <a href={`mailto:${s.email}`} className="hidden items-center gap-1.5 hover:text-gold lg:inline-flex"><Mail size={14} aria-hidden />{s.email}</a>
            <a href={`tel:${s.phone.replace(/\s/g, "")}`} dir="ltr" className="inline-flex items-center gap-1.5 whitespace-nowrap hover:text-gold"><Phone size={14} aria-hidden />{s.phone}</a>
          </div>
        </div>
      </div>
      <div className="wrap flex h-[72px] items-center justify-between gap-4 lg:h-[88px]">
        <Link href="/" className="shrink-0" aria-label={t("common.home")}>
          <Logo preload className="h-12 w-auto lg:h-[68px]" />
        </Link>
        <NavLinks categories={cats} allLabel={t("nav.allProducts")} compareLabel={t("nav.compare")} />
        <div className="flex items-center gap-1">
          <Link href="/products#search" className="hidden size-11 place-items-center rounded-lg text-brown hover:bg-sand sm:grid" aria-label={t("common.search")}>
            <Search size={21} aria-hidden />
          </Link>
          <CartLink />
          <Link href="/quote" className="btn btn-primary ms-2 hidden xl:inline-flex">{t("common.requestQuote")}</Link>
          <MobileNav categories={cats} email={s.email} phone={s.phone} />
        </div>
      </div>
    </header>
  );
}
