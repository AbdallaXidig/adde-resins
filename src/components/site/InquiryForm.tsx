"use client";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Honeypot, SelectField, TextAreaField, TextField } from "./Field";
import { useSubmit } from "./useSubmit";

export function InquiryForm({ compact }: { compact?: boolean }) {
  const t = useTranslations("forms");
  const messages = useMessages() as unknown as { forms: { categories: string[] } };
  const locale = useLocale();
  const router = useRouter();
  const { errors, formError, pending, submit } = useSubmit("/api/inquiries");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await submit({ ...Object.fromEntries(new FormData(e.currentTarget)), locale });
    if (result) router.push({ pathname: "/confirmation", query: { ref: result.reference } });
  }

  return (
    <form onSubmit={onSubmit} className="relative grid gap-4 sm:grid-cols-2">
      <Honeypot />
      <TextField label={t("name")} name="name" required autoComplete="name" maxLength={120} error={errors.name} />
      <TextField label={t("email")} name="email" type="email" required autoComplete="email" maxLength={200} error={errors.email} />
      {!compact && <TextField label={t("phone")} name="phone" type="tel" autoComplete="tel" maxLength={40} error={errors.phone} dir="ltr" />}
      <TextField label={t("company")} name="company" autoComplete="organization" maxLength={160} error={errors.company} />
      {!compact && <TextField label={t("country")} name="country" autoComplete="country-name" maxLength={80} error={errors.country} />}
      <SelectField label={t("category")} name="category" required defaultValue={messages.forms.categories[0]} error={errors.category}>
        {messages.forms.categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </SelectField>
      {!compact && <div className="sm:col-span-2"><TextField label={t("subject")} name="subject" maxLength={160} error={errors.subject} /></div>}
      <div className="sm:col-span-2">
        <TextAreaField label={t("message")} name="message" required maxLength={4000} error={errors.message} />
      </div>
      <div className="sm:col-span-2">
        {formError && <p role="alert" className="mb-3 rounded-lg bg-[#f9e1e2] px-3 py-2 text-sm text-[#86141a]">{formError}</p>}
        <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={pending}>{pending ? t("sending") : t("submitInquiry")}</button>
        <p className="mt-2 text-xs text-muted">{t("privacyNote")}</p>
      </div>
    </form>
  );
}
