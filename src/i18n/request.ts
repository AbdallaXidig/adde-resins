import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import { getContentOverrides } from "@/lib/settings";
import { deepMerge, setByPath } from "@/lib/objects";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  // English is the fallback, so a missing translation shows English and never a raw key.
  const en = (await import("../messages/en.json")).default;
  const merged: Record<string, unknown> =
    locale === "en" ? structuredClone(en) : deepMerge(en, (await import(`../messages/${locale}.json`)).default);

  // Text edited in Admin > Website content overrides the files above.
  const overrides = await getContentOverrides(locale).catch(() => []);
  for (const { key, value } of overrides) setByPath(merged, key, value);

  return { locale, messages: merged as typeof en, timeZone: "UTC" };
});
