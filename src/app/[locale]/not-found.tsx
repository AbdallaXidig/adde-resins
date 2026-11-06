import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations();
  return (
    <section className="wrap py-20 text-center">
      <p className="font-serif text-7xl text-orange/40">404</p>
      <h1 className="mt-3 text-3xl font-semibold">{t("error.notFoundTitle")}</h1>
      <p className="mx-auto mt-3 max-w-md text-muted">{t("error.notFoundText")}</p>
      <div className="mt-7 flex justify-center gap-3">
        <Link href="/products" className="btn btn-primary">{t("common.exploreProducts")}</Link>
        <Link href="/contact" className="btn btn-outline">{t("nav.contact")}</Link>
      </div>
    </section>
  );
}
