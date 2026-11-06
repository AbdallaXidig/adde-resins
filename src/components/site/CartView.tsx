"use client";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FileText, Info, MessageCircle, ShoppingCart, Trash2 } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { useCart } from "./CartProvider";
import { Honeypot, TextAreaField, TextField } from "./Field";
import { useSubmit } from "./useSubmit";

type CatalogEntry = {
  name: string; price: number | null; currency: string; moq: number | null; moqUnit: "KG" | "MT";
  cartEnabled: boolean; gradeOptions: string[]; packagingOptions: string[];
};
const kg = (q: number, u: "KG" | "MT") => (u === "MT" ? q * 1000 : q);

export function CartView({ catalog, bulkThresholdKg, whatsapp }: { catalog: Record<string, CatalogEntry>; bulkThresholdKg: number; whatsapp: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { items, ready, update, remove, clear } = useCart();
  const { errors, formError, pending, submit } = useSubmit("/api/orders");
  const [type, setType] = useState<"ORDER" | "QUOTE_REQUEST">("QUOTE_REQUEST");
  const formRef = useRef<HTMLFormElement>(null);

  const lines = useMemo(() => items.map((i) => {
    const c = catalog[i.productId];
    const available = !!c && c.cartEnabled;
    const belowMoq = !!c?.moq && kg(i.quantity, i.unit) < kg(c.moq, c.moqUnit);
    const total = available && c.price !== null ? c.price * kg(i.quantity, i.unit) : null;
    return { item: i, c, available, belowMoq, total };
  }), [items, catalog]);

  const currency = lines.find((l) => l.c)?.c?.currency ?? "USD";
  const money = (n: number) => new Intl.NumberFormat(locale === "ar" ? "ar" : "en", { style: "currency", currency }).format(n);
  const subtotal = lines.reduce((s, l) => s + (l.total ?? 0), 0);
  const anyUnpriced = lines.some((l) => l.available && l.total === null);
  const totalKg = lines.reduce((s, l) => s + kg(l.item.quantity, l.item.unit), 0);
  const blocked = lines.some((l) => !l.available || l.belowMoq) && type === "ORDER";

  if (!ready) return <div className="mt-8 h-40 animate-pulse rounded-xl bg-sand" aria-busy="true" />;
  if (items.length === 0) {
    return (
      <div className="card mt-8 flex flex-col items-center px-6 py-16 text-center">
        <ShoppingCart size={44} aria-hidden className="text-orange-dark" />
        <h2 className="mt-4 text-2xl font-semibold">{t("cart.emptyTitle")}</h2>
        <p className="mt-2 max-w-md text-muted">{t("cart.emptyText")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/products" className="btn btn-primary">{t("common.exploreProducts")}</Link>
          <Link href="/quote" className="btn btn-outline">{t("common.requestQuote")}</Link>
        </div>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const result = await submit({
      ...data, type, locale,
      items: items.filter((i) => catalog[i.productId]?.cartEnabled).map((i) => ({ productId: i.productId, grade: i.grade, packaging: i.packaging, quantity: i.quantity, unit: i.unit })),
    });
    if (result) {
      clear();
      // The quotation document is the confirmation: it shows the reference and can be saved as PDF.
      if (result.token) router.push({ pathname: `/quotation/${result.reference}`, query: { k: result.token } });
      else router.push({ pathname: "/confirmation", query: { ref: result.reference } });
    }
  }

  // Sends the cart (and any details already typed) to the sales team on WhatsApp, and logs the lead.
  function onWhatsApp(e: React.MouseEvent<HTMLAnchorElement>) {
    const form = formRef.current ? new FormData(formRef.current) : new FormData();
    const v = (k: string) => String(form.get(k) ?? "").trim();
    const listed = lines.filter((l) => l.c);
    const text = [
      t("cart.waIntro"),
      ...listed.map(({ item, c }) => `• ${c!.name}${item.grade ? ` (${item.grade})` : ""}: ${item.quantity} ${item.unit}`),
      "",
      ...[[t("forms.name"), v("name")], [t("forms.company"), v("company")], [t("forms.phone"), v("phone")], [t("forms.email"), v("email")], [t("cart.shippingCountry"), v("shippingCountry")], [t("cart.shippingPort"), v("shippingPort")]]
        .filter(([, val]) => val).map(([k, val]) => `${k}: ${val}`),
    ].join("\n").trim();
    e.currentTarget.href = `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
    if (v("website")) return;
    fetch("/api/whatsapp-click", {
      method: "POST", keepalive: true, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: v("name"), company: v("company"), phone: v("phone"), email: v("email"), country: v("shippingCountry"), locale,
        items: listed.filter((l) => l.item.quantity > 0).map(({ item }) => ({ productId: item.productId, grade: item.grade, quantity: item.quantity, unit: item.unit })),
      }),
    }).catch(() => {});
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-4">
        <ul className="space-y-3">
          {lines.map(({ item, c, available, belowMoq, total }) => (
            <li key={item.productId} className="card grid gap-4 p-4 sm:grid-cols-[96px_1fr]">
              <div className="relative size-24 overflow-hidden rounded-lg bg-sand">
                {item.image && <Image src={item.image} alt="" fill sizes="96px" className="object-cover" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/products/${item.slug}`} className="font-serif text-lg text-brown hover:text-orange-dark">{c?.name ?? item.name}</Link>
                  <button type="button" onClick={() => remove(item.productId)} className="grid size-10 shrink-0 place-items-center rounded-lg text-muted hover:bg-sand hover:text-burgundy" aria-label={t("cart.removeItem", { name: item.name })}>
                    <Trash2 size={18} aria-hidden />
                  </button>
                </div>
                {!available ? (
                  <p className="mt-1 text-sm font-semibold text-burgundy">{t("cart.unavailable")}</p>
                ) : (
                  <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto_1fr]">
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <label className="sr-only" htmlFor={`q-${item.productId}`}>{t("cart.quantity")}</label>
                      <input id={`q-${item.productId}`} type="number" min="0.001" step="any" inputMode="decimal" value={item.quantity}
                        onChange={(e) => update(item.productId, { quantity: Math.max(0, Number(e.target.value)) })} className="field" />
                      <select aria-label={t("forms.unit")} value={item.unit} onChange={(e) => update(item.productId, { unit: e.target.value as "KG" | "MT" })} className="field w-auto">
                        <option value="KG">KG</option><option value="MT">MT</option>
                      </select>
                    </div>
                    {c && c.gradeOptions.length > 0 ? (
                      <select aria-label={t("forms.grade")} value={item.grade ?? ""} onChange={(e) => update(item.productId, { grade: e.target.value || undefined })} className="field">
                        <option value="">{t("forms.anyGrade")}</option>
                        {c.gradeOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    ) : <span />}
                    <p className="self-center text-end font-semibold text-brown">{total !== null ? money(total) : t("products.priceOnRequest")}</p>
                  </div>
                )}
                {available && belowMoq && c?.moq && <p className="mt-1.5 text-sm text-burgundy">{t("cart.belowMoq", { qty: c.moq, unit: c.moqUnit })}</p>}
              </div>
            </li>
          ))}
        </ul>
        <Link href="/products" className="inline-block text-sm font-semibold text-orange-dark underline">{t("cart.continue")}</Link>
      </div>

      <form ref={formRef} onSubmit={onSubmit} className="relative space-y-5">
        <Honeypot />
        <div className="card p-5">
          <h2 className="text-xl font-semibold">{t("cart.summary")}</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">{t("cart.subtotal")}</dt><dd className="font-semibold">{subtotal > 0 ? money(subtotal) : "—"}</dd></div>
          </dl>
          {anyUnpriced && <p className="mt-3 text-sm text-muted">{subtotal > 0 ? t("cart.unpriced") : t("cart.allUnpriced")}</p>}
          <p className="mt-2 text-sm text-muted">{t("cart.freightNote")}</p>
          {totalKg >= bulkThresholdKg && <p className="mt-3 flex gap-2 rounded-lg bg-[#fdf1e7] p-3 text-sm text-[#7a3407]"><Info size={16} aria-hidden className="mt-0.5 shrink-0" />{t("cart.bulkNote")}</p>}
        </div>

        <fieldset className="card p-5">
          <legend className="sr-only">{t("cart.howTo")}</legend>
          <p className="field-label">{t("cart.howTo")}</p>
          {(["QUOTE_REQUEST", "ORDER"] as const).map((v) => (
            <label key={v} className={`mt-2 flex cursor-pointer gap-3 rounded-lg border p-3 ${type === v ? "border-orange bg-[#fdf6f0]" : "border-line"}`}>
              <input type="radio" name="type" value={v} checked={type === v} onChange={() => setType(v)} className="mt-1 accent-[#c9520c]" />
              <span><span className="block font-semibold text-brown">{v === "ORDER" ? t("cart.typeOrder") : t("cart.typeQuote")}</span>
                <span className="text-sm text-muted">{v === "ORDER" ? t("cart.typeOrderHint") : t("cart.typeQuoteHint")}</span></span>
            </label>
          ))}
        </fieldset>

        <div className="card grid gap-4 p-5">
          <h2 className="text-xl font-semibold">{t("cart.customerInfo")}</h2>
          <TextField label={t("forms.name")} name="name" required autoComplete="name" maxLength={120} error={errors.name} />
          <TextField label={t("forms.email")} name="email" type="email" required autoComplete="email" maxLength={200} error={errors.email} />
          <TextField label={t("cart.phoneWhatsapp")} name="phone" type="tel" autoComplete="tel" maxLength={40} error={errors.phone} dir="ltr" />
          <TextField label={t("cart.shippingCountry")} name="shippingCountry" required autoComplete="country-name" maxLength={80} error={errors.shippingCountry} />
          <details className="group rounded-lg border border-line px-4 py-3" open={!!(errors.company || errors.shippingPort || errors.shippingAddress || errors.notes)}>
            <summary className="cursor-pointer font-semibold text-brown">{t("cart.moreDetails")}</summary>
            <div className="mt-3 grid gap-4">
              <TextField label={t("forms.company")} name="company" autoComplete="organization" maxLength={160} error={errors.company} />
              <TextField label={t("cart.shippingPort")} name="shippingPort" maxLength={120} error={errors.shippingPort} />
              <TextAreaField label={t("cart.shippingAddress")} name="shippingAddress" rows={2} maxLength={500} error={errors.shippingAddress} />
              <TextAreaField label={t("cart.notes")} name="notes" rows={3} maxLength={4000} error={errors.notes} />
            </div>
          </details>
        </div>

        <p className="flex gap-2 text-sm text-muted"><Info size={16} aria-hidden className="mt-0.5 shrink-0" />{t("cart.noPayment")}</p>
        {formError && <p role="alert" className="rounded-lg bg-[#f9e1e2] px-3 py-2 text-sm text-[#86141a]">{formError}</p>}
        {errors["items"] && <p role="alert" className="text-sm text-burgundy">{errors["items"]}</p>}
        <button type="submit" disabled={pending || blocked} className="btn btn-primary w-full text-base">
          <FileText size={18} aria-hidden />
          {pending ? t("forms.sending") : type === "ORDER" ? t("cart.submitOrder") : t("cart.submitQuote")}
        </button>
        <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-muted" aria-hidden><span className="h-px flex-1 bg-line" />{t("cart.or")}<span className="h-px flex-1 bg-line" /></div>
        <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} onClick={onWhatsApp} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp w-full text-base">
          <MessageCircle size={18} aria-hidden />{t("cart.sendWhatsapp")}
        </a>
        <p className="text-center text-xs text-muted">{t("cart.whatsappHint")}</p>
      </form>
    </div>
  );
}
