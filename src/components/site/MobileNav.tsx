"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Mail, Menu, Phone, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { NAV_ITEMS } from "./NavLinks";

type Props = { categories: { slug: string; name: string }[]; email: string; phone: string };

export function MobileNav({ categories, email, phone }: Props) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      openRef.current?.focus();
    };
  }, [open]);

  return (
    <div className="xl:hidden">
      <button ref={openRef} type="button" className="grid size-11 place-items-center rounded-lg text-brown hover:bg-sand" aria-label={t("common.menu")} aria-expanded={open} onClick={() => setOpen(true)}>
        <Menu size={24} aria-hidden />
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={t("common.menu")} className="fixed inset-0 z-50 flex justify-end bg-charcoal/50" onClick={() => setOpen(false)}>
          <div className="flex h-full w-[86%] max-w-sm flex-col overflow-y-auto bg-cream" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between bg-brown px-4 py-3">
              <LocaleSwitcher />
              <button ref={closeRef} type="button" className="grid size-11 place-items-center rounded-lg text-white hover:bg-white/10" aria-label={t("common.close")} onClick={() => setOpen(false)}>
                <X size={24} aria-hidden />
              </button>
            </div>
            <nav className="flex-1 px-4 py-3" aria-label="Mobile">
              {NAV_ITEMS.map((item) => (
                <div key={item.key} className="border-b border-line">
                  <Link href={item.href} className="block py-3.5 font-serif text-xl text-brown">{t(`nav.${item.key}`)}</Link>
                  {item.key === "products" && (
                    <div className="pb-3 ps-3">
                      {categories.map((c) => (
                        <Link key={c.slug} href={{ pathname: "/products", query: { category: c.slug } }} className="block py-2 text-[15px] text-charcoal">{c.name}</Link>
                      ))}
                      <Link href="/products/compare" className="block py-2 text-[15px] text-charcoal">{t("nav.compare")}</Link>
                    </div>
                  )}
                </div>
              ))}
            </nav>
            <div className="space-y-3 p-4">
              <Link href="/quote" className="btn btn-primary w-full">{t("common.requestQuote")}</Link>
              <a href={`mailto:${email}`} className="flex items-center gap-2 text-sm text-brown"><Mail size={16} aria-hidden />{email}</a>
              <a href={`tel:${phone.replace(/\s/g, "")}`} dir="ltr" className="flex items-center gap-2 text-sm text-brown"><Phone size={16} aria-hidden />{phone}</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
