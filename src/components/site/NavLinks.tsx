"use client";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";

type Cat = { slug: string; name: string };

export const NAV_ITEMS = [
  { href: "/", key: "home" },
  { href: "/products", key: "products" },
  { href: "/services", key: "services" },
  { href: "/sourcing-quality", key: "sourcing" },
  { href: "/industries", key: "industries" },
  { href: "/about", key: "about" },
  { href: "/contact", key: "contact" },
] as const;

export function NavLinks({ categories, allLabel, compareLabel }: { categories: Cat[]; allLabel: string; compareLabel: string }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const cls = (href: string) =>
    `relative inline-flex h-11 items-center gap-1 whitespace-nowrap px-2.5 text-[15px] font-medium transition-colors hover:text-orange-dark ${isActive(href) ? "text-orange-dark after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:bg-orange" : "text-brown"}`;

  return (
    <nav className="hidden flex-1 items-center justify-center xl:flex" aria-label="Main">
      {NAV_ITEMS.map((item) =>
        item.key === "products" ? (
          <div key={item.key} className="group relative">
            <Link href={item.href} className={cls(item.href)} aria-current={isActive(item.href) ? "page" : undefined}>
              {t(item.key)}
              <ChevronDown size={14} aria-hidden className="transition-transform group-hover:rotate-180 group-focus-within:rotate-180" />
            </Link>
            <div className="invisible absolute start-0 top-full z-50 w-64 pt-2 opacity-0 transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <div className="card overflow-hidden py-2">
                <Link href="/products" className="block px-4 py-2 text-sm font-semibold text-brown hover:bg-cream">{allLabel}</Link>
                {categories.map((c) => (
                  <Link key={c.slug} href={{ pathname: "/products", query: { category: c.slug } }} className="block px-4 py-2 text-sm text-charcoal hover:bg-cream">{c.name}</Link>
                ))}
                <div className="my-1 border-t border-line" />
                <Link href="/products/compare" className="block px-4 py-2 text-sm text-charcoal hover:bg-cream">{compareLabel}</Link>
              </div>
            </div>
          </div>
        ) : (
          <Link key={item.key} href={item.href} className={cls(item.href)} aria-current={isActive(item.href) ? "page" : undefined}>{t(item.key)}</Link>
        ),
      )}
    </nav>
  );
}
