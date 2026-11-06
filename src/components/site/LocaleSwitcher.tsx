"use client";
import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeLabels, routing, type Locale } from "@/i18n/routing";

export function LocaleSwitcher({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <label className={`inline-flex items-center gap-1.5 ${tone === "dark" ? "text-white" : "text-brown"}`}>
      <Globe size={15} aria-hidden />
      <span className="sr-only">{t("language")}</span>
      <select
        value={locale}
        onChange={(e) => {
          router.replace(`${pathname}${window.location.search}`, { locale: e.target.value as Locale, scroll: false });
        }}
        className={`cursor-pointer bg-transparent py-1 text-[13px] ${tone === "dark" ? "text-white [&>option]:text-charcoal" : "text-brown"}`}
      >
        {routing.locales.map((l) => (
          <option key={l} value={l}>{localeLabels[l]}</option>
        ))}
      </select>
    </label>
  );
}
