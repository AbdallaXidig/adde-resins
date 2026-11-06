import { defineRouting } from "next-intl/routing";

// To add a language: add its code here, add src/messages/<code>.json, and add a label below.
export const routing = defineRouting({
  locales: ["en", "so", "ar"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];

export const localeLabels: Record<Locale, string> = { en: "English", so: "Soomaali", ar: "العربية" };
export const rtlLocales: Locale[] = ["ar"];
