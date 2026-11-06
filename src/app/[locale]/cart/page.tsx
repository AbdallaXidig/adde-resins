import { getLocale, getTranslations } from "next-intl/server";
import { getPublishedProducts } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { CartView } from "@/components/site/CartView";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("cartTitle"), robots: { index: false } };
}

export default async function CartPage() {
  const locale = await getLocale();
  const t = await getTranslations("cart");
  const [products, s] = await Promise.all([getPublishedProducts(locale), getSettings()]);
  // Current catalogue facts, so the cart reflects today's prices and availability, not stored ones.
  const catalog = Object.fromEntries(products.map((p) => [p.id, {
    name: p.name, price: p.price, currency: p.currency, moq: p.moq, moqUnit: p.moqUnit,
    cartEnabled: p.cartEnabled, gradeOptions: p.gradeOptions, packagingOptions: p.isDemo ? [] : p.packagingOptions,
  }]));
  return (
    <section className="wrap py-10 lg:py-14">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1 className="h-display mt-3">{t("title")}</h1>
      <CartView catalog={catalog} bulkThresholdKg={s.bulkThresholdKg} />
    </section>
  );
}
