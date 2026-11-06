"use client";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Honeypot, SelectField, TextAreaField, TextField } from "./Field";
import { useSubmit } from "./useSubmit";

export type QuoteProduct = { id: string; slug: string; name: string; gradeOptions: string[]; packagingOptions: string[]; isDemo: boolean };

export function QuoteForm({ products, initialSlug }: { products: QuoteProduct[]; initialSlug?: string }) {
  const t = useTranslations("forms");
  const locale = useLocale();
  const router = useRouter();
  const { errors, formError, pending, submit } = useSubmit("/api/rfq");
  const [selected, setSelected] = useState(products.find((p) => p.slug === initialSlug)?.id ?? "");
  const product = useMemo(() => products.find((p) => p.id === selected), [products, selected]);
  const today = new Date().toISOString().slice(0, 10);
  const other = selected === "other";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const result = await submit({
      ...data,
      productId: product?.id,
      productName: product?.name ?? data.productOtherName ?? "",
      locale,
    });
    if (result) router.push({ pathname: "/confirmation", query: { ref: result.reference } });
  }

  return (
    <form onSubmit={onSubmit} noValidate={false} className="relative grid gap-4 sm:grid-cols-2">
      <Honeypot />
      <div className="sm:col-span-2">
        <SelectField label={t("product")} name="selection" required value={selected} onChange={(e) => setSelected(e.target.value)} error={errors.productName}>
          <option value="" disabled>{t("selectProduct")}</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          <option value="other">{t("otherProduct")}</option>
        </SelectField>
      </div>
      {other && (
        <div className="sm:col-span-2">
          <TextField label={t("productOtherName")} name="productOtherName" required maxLength={160} />
        </div>
      )}
      <SelectField label={t("grade")} name="grade" defaultValue="" key={`g-${selected}`} error={errors.grade}>
        <option value="">{t("anyGrade")}</option>
        {product?.gradeOptions.map((g) => <option key={g} value={g}>{g}</option>)}
      </SelectField>
      <SelectField label={t("packaging")} name="packaging" defaultValue="" key={`p-${selected}`}>
        <option value="">{t("anyPackaging")}</option>
        {!product?.isDemo && product?.packagingOptions.map((p) => <option key={p} value={p}>{p}</option>)}
      </SelectField>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <TextField label={t("quantity")} name="quantity" type="number" inputMode="decimal" min="0.001" step="any" required error={errors.quantity} />
        <SelectField label={t("unit")} name="unit" required defaultValue="MT">
          <option value="KG">{t("unitKG")}</option>
          <option value="MT">{t("unitMT")}</option>
        </SelectField>
      </div>
      <TextField label={t("deliveryDate")} name="deliveryDate" type="date" min={today} error={errors.deliveryDate} />
      <TextField label={t("destinationCountry")} name="destinationCountry" required autoComplete="country-name" maxLength={80} error={errors.destinationCountry} />
      <TextField label={t("destinationPort")} name="destinationPort" required maxLength={120} error={errors.destinationPort} />
      <TextField label={t("name")} name="name" required autoComplete="name" maxLength={120} error={errors.name} />
      <TextField label={t("company")} name="company" required autoComplete="organization" maxLength={160} error={errors.company} />
      <TextField label={t("email")} name="email" type="email" required autoComplete="email" maxLength={200} error={errors.email} />
      <TextField label={t("phone")} name="phone" type="tel" autoComplete="tel" maxLength={40} error={errors.phone} dir="ltr" />
      <div className="sm:col-span-2">
        <TextAreaField label={t("requirements")} name="requirements" hint={t("requirementsHint")} maxLength={4000} error={errors.requirements} />
      </div>
      <div className="sm:col-span-2">
        {formError && <p role="alert" className="mb-3 rounded-lg bg-[#f9e1e2] px-3 py-2 text-sm text-[#86141a]">{formError}</p>}
        <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={pending}>{pending ? t("sending") : t("submitQuote")}</button>
        <p className="mt-2 text-xs text-muted">{t("privacyNote")}</p>
      </div>
    </form>
  );
}
