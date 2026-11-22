import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100").replace(/\/$/, "");

export const localePath = (locale: string, path: string) =>
  `${locale === routing.defaultLocale ? "" : `/${locale}`}${path === "/" && locale !== routing.defaultLocale ? "" : path}`;

export function pageMetadata({ locale, path, title, description, image }: {
  locale: string; path: string; title: string; description: string; image?: string;
}): Metadata {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = `${siteUrl()}${localePath(l, path)}`;
  languages["x-default"] = `${siteUrl()}${path}`;
  const og = image ?? "/assets/img/somalia-karin-bosaso.webp";
  return {
    title,
    description,
    alternates: { canonical: `${siteUrl()}${localePath(locale, path)}`, languages },
    openGraph: {
      title, description, type: "website", siteName: "Adde General LLC",
      url: `${siteUrl()}${localePath(locale, path)}`, locale, images: [{ url: og }],
    },
    twitter: { card: "summary_large_image", title, description, images: [og] },
  };
}
