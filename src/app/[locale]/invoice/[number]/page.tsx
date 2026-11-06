import { timingSafeEqual } from "node:crypto";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { METHOD_LABELS } from "@/lib/finance";
import { Logo } from "@/components/site/Logo";
import { PrintButton } from "@/components/site/PrintButton";

export const metadata = { title: "Document", robots: { index: false, follow: false } };

const same = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
const money = (n: number, c = "USD") => new Intl.NumberFormat("en", { style: "currency", currency: c }).format(n);
const day = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(d) : "—");
const qty = (n: number) => new Intl.NumberFormat("en", { maximumFractionDigits: 3 }).format(n);

/** A quotation or invoice made in the admin. Shared with the customer through its secret link. */
export default async function SalesDocumentPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ k?: string }> }) {
  const [{ number }, { k }] = await Promise.all([params, searchParams]);
  if (!/^ADI-(QUO|INV)-\d{4}-\d{5,}$/.test(number) || typeof k !== "string" || k.length > 64) notFound();
  const doc = await prisma.salesDocument.findUnique({ where: { number }, include: { customer: true, items: { orderBy: { sortOrder: "asc" } }, payments: { orderBy: { date: "asc" } } } });
  if (!doc?.accessToken || !same(doc.accessToken, k)) notFound();
  const s = await getSettings();
  const isQuote = doc.kind === "QUOTATION";
  const total = Number(doc.total), paid = Number(doc.amountPaid);
  const status = doc.status === "VOID" ? "VOID" : doc.status === "DRAFT" ? "DRAFT" : isQuote ? null : paid >= total && total > 0 ? "PAID" : paid > 0 ? "PART PAID" : null;

  return (
    <section className="wrap py-8 lg:py-12 print:p-0" dir="ltr" lang="en">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <p className="text-sm text-muted">{isQuote ? "Quotation" : "Invoice"} {doc.number} from {s.companyName}</p>
          <PrintButton />
        </div>
        <article className="card overflow-hidden print:rounded-none print:shadow-none">
          <div className="h-2 bg-orange" aria-hidden />
          <div className="p-6 sm:p-10 print:p-0 print:pt-6">
            <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
              <div>
                <Logo className="h-auto w-44" />
                <p className="mt-3 text-sm text-muted">{s.companyName}<br />{s.location}<br /><span dir="ltr">{s.phone}</span> · {s.email}</p>
              </div>
              <div className="text-end">
                <h1 className="text-3xl font-semibold uppercase tracking-wide text-brown">{isQuote ? "Quotation" : "Invoice"}</h1>
                {status && <p className={`mt-2 inline-block -rotate-3 rounded-md border-[3px] px-3 py-0.5 text-lg font-black tracking-widest ${status === "VOID" ? "border-burgundy text-burgundy" : status === "DRAFT" ? "border-muted text-muted" : "border-[#1d7a3a] text-[#1d7a3a]"}`}>{status}</p>}
                <dl className="mt-3 grid grid-cols-[auto_auto] justify-end gap-x-4 gap-y-1 text-sm">
                  <dt className="text-muted">Number</dt><dd className="font-mono font-semibold" dir="ltr">{doc.number}</dd>
                  <dt className="text-muted">Date</dt><dd>{day(doc.issueDate)}</dd>
                  {doc.dueDate && <><dt className="text-muted">{isQuote ? "Valid until" : "Payment due"}</dt><dd>{day(doc.dueDate)}</dd></>}
                </dl>
              </div>
            </header>
            <div className="grid gap-6 border-b border-line py-6 sm:grid-cols-2">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{isQuote ? "Prepared for" : "Bill to"}</h2>
                <p className="mt-2 font-semibold text-brown">{doc.customer.company ?? doc.customer.name}</p>
                {doc.customer.company && <p className="text-sm">{doc.customer.name}</p>}
                {doc.customer.address && <p className="whitespace-pre-line text-sm">{doc.customer.address}</p>}
                {doc.customer.country && <p className="text-sm">{doc.customer.country}</p>}
                <p className="text-sm" dir="ltr">{[doc.customer.phone, doc.customer.email].filter(Boolean).join(" · ")}</p>
              </div>
              {doc.shipTo && <div><h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Ship to</h2><p className="mt-2 whitespace-pre-line text-sm font-semibold text-brown">{doc.shipTo}</p></div>}
            </div>
            <div className="overflow-x-auto py-6">
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr className="border-b-2 border-brown text-xs uppercase tracking-wider text-muted">
                  <th className="py-2 pe-3 text-start font-semibold">Description</th><th className="px-3 py-2 text-end font-semibold">Quantity</th>
                  <th className="px-3 py-2 text-end font-semibold">Price per kg</th><th className="py-2 ps-3 text-end font-semibold">Amount</th></tr></thead>
                <tbody>{doc.items.map((i) => (
                  <tr key={i.id} className="border-b border-line align-top">
                    <td className="py-3 pe-3"><p className="font-semibold text-brown">{i.description}</p>{i.grade && <p className="text-xs text-muted">Grade: {i.grade}</p>}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-end">{qty(Number(i.quantity))} {i.unit}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-end">{money(Number(i.unitPrice), doc.currency)}</td>
                    <td className="whitespace-nowrap py-3 ps-3 text-end font-semibold">{money(Number(i.lineTotal), doc.currency)}</td>
                  </tr>
                ))}</tbody>
              </table>
              <dl className="ms-auto mt-4 max-w-xs space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{money(Number(doc.subtotal), doc.currency)}</dd></div>
                {Number(doc.discount) > 0 && <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd>−{money(Number(doc.discount), doc.currency)}</dd></div>}
                {Number(doc.shipping) > 0 && <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{money(Number(doc.shipping), doc.currency)}</dd></div>}
                {Number(doc.tax) > 0 && <div className="flex justify-between"><dt className="text-muted">Tax</dt><dd>{money(Number(doc.tax), doc.currency)}</dd></div>}
                <div className="flex justify-between border-t-2 border-brown pt-2 text-lg font-bold text-brown"><dt>Total</dt><dd>{money(total, doc.currency)}</dd></div>
                {!isQuote && paid > 0 && <>
                  <div className="flex justify-between"><dt className="text-muted">Paid</dt><dd>{money(paid, doc.currency)}</dd></div>
                  <div className="flex justify-between font-bold"><dt>Balance due</dt><dd>{money(Math.max(0, total - paid), doc.currency)}</dd></div>
                </>}
              </dl>
            </div>
            {!isQuote && doc.payments.length > 0 && (
              <div className="border-t border-line py-5 text-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Payments received</h2>
                <ul className="mt-2 space-y-1">{doc.payments.map((p) => <li key={p.id} className="flex justify-between gap-4"><span>{day(p.date)} · {METHOD_LABELS[p.method]} · <span className="font-mono text-xs">{p.number}</span></span><span>{money(Number(p.amount), doc.currency)}</span></li>)}</ul>
              </div>
            )}
            {doc.notes && <div className="border-t border-line py-5"><h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Notes</h2><p className="mt-2 whitespace-pre-line text-sm">{doc.notes}</p></div>}
            {!isQuote && s.paymentInstructions && <div className="rounded-lg bg-cream p-5 text-sm print:border print:border-line"><h2 className="font-semibold text-brown">How to pay</h2><p className="mt-2 whitespace-pre-line">{s.paymentInstructions}</p></div>}
            {isQuote && <p className="rounded-lg bg-cream p-5 text-sm text-muted print:border print:border-line">This quotation is valid until the date shown. Freight, insurance and duties are only included where listed. Please quote {doc.number} when you confirm.</p>}
            <p className="mt-6 text-center text-xs text-muted">{s.companyName} · <span dir="ltr">{s.phone}</span> · {s.email}</p>
          </div>
        </article>
      </div>
    </section>
  );
}
