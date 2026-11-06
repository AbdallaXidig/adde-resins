import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, MessageCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { siteUrl } from "@/lib/seo";
import { METHOD_LABELS } from "@/lib/finance";
import { changeSalesStatus, convertQuotationAction, deletePaymentAction, deleteSalesDraft } from "../../../actions/finance";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { PaymentForm } from "@/components/admin/PaymentForm";
import { Empty, PageHeader, Panel, fmtDate, fmtMoney, fmtQty } from "@/components/admin/ui";
import { KIND_LABELS, SalesBadge, isOverdue } from "@/components/admin/finance-ui";

export const metadata = { title: "Sales document" };

function StatusButton({ id, to, label, tone = "btn-outline", confirm }: { id: string; to: string; label: string; tone?: string; confirm?: string }) {
  return (
    <form action={changeSalesStatus}>
      <input type="hidden" name="id" value={id} /><input type="hidden" name="to" value={to} /><input type="hidden" name="_back" value={`/admin/sales/${id}`} />
      <button type="submit" className={`btn ${tone} text-sm`} title={confirm}>{label}</button>
    </form>
  );
}

export default async function SalesDoc({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: FlashParams }) {
  const user = await requirePermission("sales");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const doc = await prisma.salesDocument.findUnique({
    where: { id },
    include: { customer: true, items: { orderBy: { sortOrder: "asc" } }, payments: { orderBy: { date: "desc" }, include: { account: true } }, order: { select: { id: true, reference: true } } },
  });
  if (!doc) notFound();
  const [fromQuote, toInvoice] = await Promise.all([
    doc.quotationId ? prisma.salesDocument.findUnique({ where: { id: doc.quotationId }, select: { id: true, number: true } }) : null,
    doc.kind === "QUOTATION" ? prisma.salesDocument.findFirst({ where: { quotationId: doc.id, status: { not: "VOID" } }, select: { id: true, number: true } }) : null,
  ]);
  const total = Number(doc.total), paid = Number(doc.amountPaid), balance = total - paid;
  const canPay = can(user.role, "accounting");
  const isQuote = doc.kind === "QUOTATION";
  const back = `/admin/sales/${id}`;
  const link = doc.accessToken ? `${siteUrl()}/invoice/${doc.number}?k=${doc.accessToken}` : null;
  const phone = doc.customer.phone?.replace(/\D/g, "");
  const waText = `Hello ${doc.customer.name}, here is your ${isQuote ? "quotation" : "invoice"} ${doc.number} from Adde International (${fmtMoney(total)}): ${link}`;

  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title={doc.number} text={`${KIND_LABELS[doc.kind]} for ${doc.customer.company ?? doc.customer.name}`}
        action={<div className="flex items-center gap-3"><SalesBadge status={doc.status} overdue={isOverdue(doc)} /><Link href="/admin/sales" className="btn btn-outline">Back</Link></div>} />

      <div className="mb-6 flex flex-wrap gap-2">
        {doc.status === "DRAFT" && <Link href={`${back}/edit`} className="btn btn-primary text-sm">Edit draft</Link>}
        {isQuote && doc.status === "DRAFT" && <StatusButton id={id} to="SENT" label="Mark as sent" />}
        {isQuote && ["DRAFT", "SENT"].includes(doc.status) && <><StatusButton id={id} to="ACCEPTED" label="Customer accepted" /><StatusButton id={id} to="DECLINED" label="Customer declined" /></>}
        {isQuote && !toInvoice && !["DECLINED", "VOID"].includes(doc.status) && (
          <form action={convertQuotationAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="_back" value={back} /><button className="btn btn-primary text-sm">Convert to invoice</button></form>
        )}
        {!isQuote && doc.status === "DRAFT" && <StatusButton id={id} to="ISSUED" label="Issue invoice" tone="btn-primary" />}
        {link && doc.status !== "VOID" && <a href={link} target="_blank" rel="noopener" className="btn btn-outline text-sm"><ExternalLink size={16} aria-hidden />Open / print</a>}
        {link && phone && phone.length >= 8 && doc.status !== "VOID" && <a href={`https://wa.me/${phone}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp text-sm"><MessageCircle size={16} aria-hidden />Send on WhatsApp</a>}
        {doc.status === "DRAFT" && doc.payments.length === 0 && (
          <form action={deleteSalesDraft}><input type="hidden" name="id" value={id} /><input type="hidden" name="_back" value={back} /><button className="btn btn-outline text-sm text-burgundy">Delete draft</button></form>
        )}
        {doc.status !== "VOID" && doc.status !== "DRAFT" && doc.payments.length === 0 && <StatusButton id={id} to="VOID" label="Void" tone="btn-outline text-burgundy" />}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Panel title="Items">
            <div className="overflow-x-auto"><table className="admin-table min-w-[600px]">
              <thead><tr><th>Description</th><th>Grade</th><th className="text-end">Quantity</th><th className="text-end">Price / kg</th><th className="text-end">Amount</th></tr></thead>
              <tbody>{doc.items.map((i) => (
                <tr key={i.id}><td>{i.productId ? <Link href={`/admin/products/${i.productId}`} className="underline">{i.description}</Link> : i.description}</td><td>{i.grade ?? "—"}</td>
                  <td className="whitespace-nowrap text-end">{fmtQty(i.quantity.toString(), i.unit)}</td><td className="text-end">{fmtMoney(Number(i.unitPrice))}</td><td className="whitespace-nowrap text-end font-semibold">{fmtMoney(Number(i.lineTotal))}</td></tr>
              ))}</tbody>
            </table></div>
            <dl className="ms-auto mt-4 max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{fmtMoney(Number(doc.subtotal))}</dd></div>
              {Number(doc.discount) > 0 && <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd>−{fmtMoney(Number(doc.discount))}</dd></div>}
              {Number(doc.shipping) > 0 && <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{fmtMoney(Number(doc.shipping))}</dd></div>}
              {Number(doc.tax) > 0 && <div className="flex justify-between"><dt className="text-muted">Tax</dt><dd>{fmtMoney(Number(doc.tax))}</dd></div>}
              <div className="flex justify-between border-t border-line pt-1.5 text-base font-bold text-brown"><dt>Total</dt><dd>{fmtMoney(total)}</dd></div>
              {!isQuote && doc.status !== "DRAFT" && <>
                <div className="flex justify-between"><dt className="text-muted">Paid</dt><dd>{fmtMoney(paid)}</dd></div>
                <div className="flex justify-between font-semibold"><dt>Balance due</dt><dd className={balance > 0 ? "text-burgundy" : "text-[#1d5c2d]"}>{fmtMoney(balance)}</dd></div>
              </>}
            </dl>
          </Panel>

          {!isQuote && (
            <Panel title="Payments">
              {doc.payments.length === 0 ? <Empty>No payments recorded yet.</Empty> : (
                <div className="overflow-x-auto"><table className="admin-table">
                  <thead><tr><th>Receipt</th><th>Date</th><th>Method</th><th>Account</th><th>Reference</th><th className="text-end">Amount</th><th /></tr></thead>
                  <tbody>{doc.payments.map((p) => (
                    <tr key={p.id}><td className="font-mono text-xs">{p.number}</td><td className="whitespace-nowrap">{fmtDate(p.date)}</td><td>{METHOD_LABELS[p.method]}</td><td>{p.account?.name ?? "—"}</td><td>{p.reference ?? "—"}</td><td className="text-end font-semibold">{fmtMoney(Number(p.amount))}</td>
                      <td>{canPay && <form action={deletePaymentAction}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="_back" value={back} /><button className="text-xs text-burgundy underline">Delete</button></form>}</td></tr>
                  ))}</tbody>
                </table></div>
              )}
              {canPay && ["ISSUED", "PARTIALLY_PAID"].includes(doc.status) && (
                <div className="mt-5 border-t border-line pt-5"><h3 className="mb-3 font-semibold">Record a payment</h3><PaymentForm back={back} documentId={doc.id} direction="IN" suggested={balance} /></div>
              )}
              {!canPay && <p className="mt-3 text-sm text-muted">Payments are recorded by an accountant or manager.</p>}
              {doc.status === "DRAFT" && <p className="mt-3 text-sm text-muted">Issue the invoice to start recording payments.</p>}
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <Panel title="Customer">
            <p className="font-semibold"><Link href={`/admin/customers/${doc.customer.id}`} className="underline">{doc.customer.name}</Link></p>
            {doc.customer.company && <p className="text-sm">{doc.customer.company}</p>}
            <p className="text-sm">{[doc.customer.phone, doc.customer.email].filter(Boolean).join(" · ")}</p>
            {doc.shipTo && <p className="mt-3 whitespace-pre-line text-sm"><span className="text-muted">Ship to:</span> {doc.shipTo}</p>}
          </Panel>
          <Panel title="Details">
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted">Date</dt><dd>{fmtDate(doc.issueDate)}</dd>
              <dt className="text-muted">{isQuote ? "Valid until" : "Due"}</dt><dd>{fmtDate(doc.dueDate)}</dd>
              <dt className="text-muted">Created by</dt><dd>{doc.createdByName ?? "—"}</dd>
              <dt className="text-muted">Stock</dt><dd>{doc.stockCommitted ? "Deducted from stock (tracked products only)" : isQuote ? "Not affected" : doc.status === "DRAFT" ? "Taken out when issued" : "Not taken (untracked or already taken by the website order)"}</dd>
              {doc.order && <><dt className="text-muted">Website request</dt><dd><Link href={`/admin/orders/${doc.order.id}`} className="font-mono underline">{doc.order.reference}</Link></dd></>}
              {fromQuote && <><dt className="text-muted">From quotation</dt><dd><Link href={`/admin/sales/${fromQuote.id}`} className="font-mono underline">{fromQuote.number}</Link></dd></>}
              {toInvoice && <><dt className="text-muted">Invoice</dt><dd><Link href={`/admin/sales/${toInvoice.id}`} className="font-mono underline">{toInvoice.number}</Link></dd></>}
            </dl>
            {doc.notes && <p className="mt-4 whitespace-pre-line border-t border-line pt-3 text-sm"><span className="block text-muted">Printed notes</span>{doc.notes}</p>}
            {doc.internalNotes && <p className="mt-3 whitespace-pre-line text-sm"><span className="block text-muted">Internal notes</span>{doc.internalNotes}</p>}
          </Panel>
        </div>
      </div>
    </>
  );
}
