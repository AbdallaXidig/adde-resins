import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Fraunces, Inter, Noto_Naskh_Arabic, IBM_Plex_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, rtlLocales, type Locale } from "@/i18n/routing";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/seo";
import { CartProvider } from "@/components/site/CartProvider";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { WhatsAppFloat } from "@/components/site/WhatsAppFloat";
import "../globals.css";

const heading = Fraunces({ subsets: ["latin"], variable: "--font-heading", display: "swap", weight: ["500", "600", "700"] });
const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const headingAr = Noto_Naskh_Arabic({ subsets: ["arabic"], variable: "--font-heading", display: "swap", weight: ["500", "600", "700"] });
const bodyAr = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], variable: "--font-body", display: "swap", weight: ["400", "500", "600"] });

export const dynamic = "force-dynamic";
export const viewport: Viewport = { themeColor: "#402313", width: "device-width", initialScale: 1 };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t("defaultTitle"), template: `%s | ${t("siteName")}` },
    description: t("defaultDescription"),
    icons: { icon: "/assets/brand/adde-icon-512.png", apple: "/assets/brand/adde-icon-512.png" },
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("common");
  const s = await getSettings();
  const rtl = rtlLocales.includes(locale as Locale);
  const fonts = rtl ? `${headingAr.variable} ${bodyAr.variable}` : `${heading.variable} ${body.variable}`;

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: s.companyName,
    url: siteUrl(),
    logo: `${siteUrl()}/assets/brand/adde-logo.png`,
    foundingDate: "2003",
    email: s.email,
    telephone: s.phone,
    address: { "@type": "PostalAddress", addressRegion: "Puntland", addressCountry: "SO" },
  };

  return (
    <html lang={locale} dir={rtl ? "rtl" : "ltr"} className={fonts}>
      <body className="min-h-screen antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">{t("skip")}</a>
        <NextIntlClientProvider>
          <CartProvider>
            <Header />
            <main id="main">{children}</main>
            <Footer />
            <WhatsAppFloat />
          </CartProvider>
        </NextIntlClientProvider>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd).replace(/</g, "\\u003c") }} />
      </body>
    </html>
  );
}
