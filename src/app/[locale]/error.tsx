"use client";
import { useTranslations } from "next-intl";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("error");
  return (
    <section className="wrap py-20 text-center">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p className="mx-auto mt-3 max-w-md text-muted">{t("text")}</p>
      <button type="button" onClick={reset} className="btn btn-primary mt-7">{t("retry")}</button>
    </section>
  );
}
