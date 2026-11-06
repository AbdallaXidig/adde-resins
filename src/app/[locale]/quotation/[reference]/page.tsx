import { timingSafeEqual } from "node:crypto";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { Logo } from "@/components/site/Logo";
import { QuotationActions } from "@/components/site/QuotationActions";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "quotation" });
  return { title: t("titleQuote"), robots: { index: false, follow: false } };
}

const sameToken = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

type Props = { params: Promise<{ locale: string; reference: string }>; searchParams: Promise<{ k?: string }> };

/** The customer's quotation or pro-forma document. Only reachable with the secret link from checkout. */
export default async function QuotationPage({ params, searchParams }: Props) {
  const [{ locale, reference }, { k }] = await Promise.all([params, searchParams]);
  if (!/^ADI-ORD-\d{4}-\d{5,}$/.test(reference) || typeof k !== "string" || k.length > 64) notFound();
  const order = await prisma.order.findUnique({
    where: { reference },
    include: { customer: true, items: { include: { product: { select: { isDemo: true } } } } },
  });
  if (!order?.accessToken || !sameToken(order.accessToken, k)) notFound();

  const [t, tp, s] = await Promise.all([getTranslations("quotation"), getTranslations("products"), getSettings()]);
  const nf = locale === "ar" ? "ar" : "en";
  const money = (n: number) => new Intl.NumberFormat(nf, { style: "currency", currency: order.currency }).format(n);
  const qty = (n: number) => new Intl.NumberFormat(nf, { maximumFractionDigits: 3 }).format(n);
  const date = new Intl.DateTimeFormat(nf === "ar" ? "ar" : "en-GB", { dateStyle: "long" }).format(order.createdAt);
  const isQuote = order.type === "QUOTE_REQUEST";
  const hasSample = order.items.some((i) => i.product?.isDemo);
  const link = `${siteUrl()}${locale === "en" ? "" : `/${locale}`}/quotation/${order.reference}?k=${order.accessToken}`;

  return (
    <section className="wrap py-8 lg:py-12 print:p-0">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 rounded-xl bg-[#e3f1e6] p-5 text-[#1d5c2d] print:hidden">
          <p className="flex items-center gap-2 font-semibold"><CheckCircle2 size={20} aria-hidden />{isQuote ? t("readyQuote") : t("readyOrder")}</p>
          <p className="mt-1 text-sm">{t("readyText")}</p>
          <QuotationActions whatsapp={s.whatsapp} message={t("whatsappText", { ref: order.reference, link })} />
        </div>

        <article className="card overflow-hidden print:rounded-none print:shadow-none" aria-label={isQuote ? t("titleQuote") : t("titleOrder")}>
          <div className="h-2 bg-orange" aria-hidden />
          <div className="p-6 sm:p-10 print:p-0 print:pt-6">
            <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
              <div>
                <Logo className="h-auto w-44" />
                <p className="mt-3 text-sm text-muted">{s.companyName}<br />{s.location}<br /><span dir="ltr">{s.phone}</span> · {s.email}</p>
              </div>
              <div className="text-end">
                <h1 className="text-3xl font-semibold uppercase tracking-wide text-brown">{isQuote ? t("titleQuote") : t("titleOrder")}</h1>
                <dl className="mt-3 grid grid-cols-[auto_auto] justify-end gap-x-4 gap-y-1 text-sm">
                  <dt className="text-muted">{t("reference")}</dt><dd className="font-mono font-semibold" dir="ltr" data-testid="reference">{order.reference}</dd>
                  <dt className="text-muted">{t("date")}</dt><dd>{date}</dd>
                  <dt className="text-muted">{t("status")}</dt><dd>{t("statusPending")}</dd>
                </dl>
              </div>
            </header>

            <div className="grid gap-6 border-b border-line py-6 sm:grid-cols-2">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{t("preparedFor")}</h2>
                <p className="mt-2 font-semibold text-brown">{order.customer.name}</p>
                {order.customer.company && <p className="text-sm">{order.customer.company}</p>}
                <p className="text-sm">{order.customer.email}</p>
                {order.customer.phone && <p className="text-sm" dir="ltr">{order.customer.phone}</p>}
              </div>
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{t("destination")}</h2>
                <p className="mt-2 font-semibold text-brown">{[order.shippingPort, order.shippingCountry].filter(Boolean).join(", ")}</p>
                {order.shippingAddress && <p className="whitespace-pre-line text-sm">{order.shippingAddress}</p>}
              </div>
            </div>

            <div className="overflow-x-auto py-6">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b-2 border-brown text-start text-xs uppercase tracking-wider text-muted">
                    <th className="py-2 pe-3 text-start font-semibold">{t("product")}</th>
                    <th className="px-3 py-2 text-end font-semibold">{t("quantity")}</th>
                    <th className="px-3 py-2 text-end font-semibold">{t("unitPrice")}</th>
                    <th className="py-2 ps-3 text-end font-semibold">{t("amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((i) => (
                    <tr key={i.id} className="border-b border-line align-top">
                      <td className="py-3 pe-3">
                        <p className="font-semibold text-brown">{i.productName}</p>
                        <p className="text-xs text-muted">{[i.grade && `${t("grade")}: ${i.grade}`, i.packaging].filter(Boolean).join(" · ")}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-end">{qty(Number(i.quantity))} {i.unit}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-end">{i.unitPricePerKg ? money(Number(i.unitPricePerKg)) : "—"}</td>
                      <td className="whitespace-nowrap py-3 ps-3 text-end font-semibold">{i.lineTotal ? money(Number(i.lineTotal)) : tp("priceOnRequest")}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="pt-4 text-end font-semibold text-brown">{t("subtotal")}</td>
                    <td className="whitespace-nowrap pt-4 ps-3 text-end text-lg font-bold text-brown" data-testid="subtotal">{order.subtotal ? money(Number(order.subtotal)) : "—"}</td>
                  </tr>
                </tfoot>
              </table>
              {order.hasUnpricedItems && <p className="mt-2 text-end text-sm text-muted">{t("unpricedNote")}</p>}
            </div>

            {order.notes && (
              <div className="border-t border-line py-5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{t("notes")}</h2>
                <p className="mt-2 whitespace-pre-line text-sm">{order.notes}</p>
              </div>
            )}

            <div className="rounded-lg bg-cream p-5 text-sm print:border print:border-line">
              <h2 className="font-semibold text-brown">{t("terms")}</h2>
              <ul className="mt-2 list-disc space-y-1 ps-5 text-muted">
                <li>{t("term1")}</li><li>{t("term2")}</li><li>{t("term3")}</li><li>{t("term4")}</li>
                {hasSample && <li className="font-semibold text-[#8a3a08]">{t("sampleNote")}</li>}
              </ul>
            </div>
            <p className="mt-6 text-center text-xs text-muted">{s.companyName} · <span dir="ltr">{s.phone}</span> · {s.email}</p>
          </div>
        </article>
      </div>
    </section>
  );
}
