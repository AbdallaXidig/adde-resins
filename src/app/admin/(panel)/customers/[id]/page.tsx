import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { METHOD_LABELS } from "@/lib/finance";
import { saveCustomer } from "../../../actions/finance";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { ContactLinks } from "@/components/admin/StatusForm";
import { PartyFields, SOURCE_LABELS } from "@/components/admin/PartyFields";
import { Empty, PageHeader, Panel, StatusBadge, fmtDate, fmtMoney, fmtQty } from "@/components/admin/ui";
import { KIND_LABELS, SalesBadge, Stat, isOverdue } from "@/components/admin/finance-ui";

export const metadata = { title: "Customer" };

export default async function CustomerDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: FlashParams }) {
  const user = await requirePermission("customers");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const c = await prisma.customer.findUnique({ where: { id }, include: {
    rfqs: { orderBy: { createdAt: "desc" } }, orders: { orderBy: { createdAt: "desc" }, include: { items: true } }, inquiries: { orderBy: { createdAt: "desc" } },
    salesDocuments: { orderBy: { issueDate: "desc" } }, payments: { orderBy: { date: "desc" }, take: 20 },
  } });
  if (!c) notFound();
  const canSell = can(user.role, "sales");
  const invoices = c.salesDocuments.filter((d) => d.kind === "INVOICE" && !["DRAFT", "VOID"].includes(d.status));
  const invoiced = invoices.reduce((s, d) => s + Number(d.total), 0);
  const paid = invoices.reduce((s, d) => s + Number(d.amountPaid), 0);
  const history = [
    ...c.rfqs.map((r) => ({ id: r.id, href: `/admin/rfqs/${r.id}`, ref: r.reference, kind: "Website RFQ", what: `${r.productName} · ${fmtQty(r.quantity.toString(), r.unit)}`, date: r.createdAt, status: r.status })),
    ...c.orders.map((o) => ({ id: o.id, href: `/admin/orders/${o.id}`, ref: o.reference, kind: o.type === "ORDER" ? "Website order" : "Cart quotation", what: o.items.map((i) => i.productName).join(", "), date: o.createdAt, status: o.status })),
    ...c.inquiries.map((q) => ({ id: q.id, href: `/admin/inquiries/${q.id}`, ref: q.reference, kind: "Inquiry", what: q.category, date: q.createdAt, status: q.status })),
  ].sort((a, b) => +b.date - +a.date);
  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title={c.name} text={[c.company, SOURCE_LABELS[c.source]].filter(Boolean).join(" · ")}
        action={<div className="flex flex-wrap gap-2">{canSell && <><Link href={`/admin/sales/new?kind=QUOTATION&customer=${c.id}`} className="btn btn-outline">New quotation</Link><Link href={`/admin/sales/new?kind=INVOICE&customer=${c.id}`} className="btn btn-primary">New invoice</Link></>}<Link href="/admin/customers" className="btn btn-outline">Back</Link></div>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Invoiced" value={fmtMoney(invoiced)} /><Stat label="Paid" value={fmtMoney(paid)} tone="ok" /><Stat label="Balance owed" value={fmtMoney(invoiced - paid)} tone={invoiced - paid > 0 ? "bad" : undefined} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Panel title="Quotations and invoices">
            {c.salesDocuments.length === 0 ? <Empty>None yet.</Empty> : (
              <div className="overflow-x-auto"><table className="admin-table">
                <thead><tr><th>Number</th><th>Type</th><th>Date</th><th className="text-end">Total</th><th className="text-end">Balance</th><th>Status</th></tr></thead>
                <tbody>{c.salesDocuments.map((d) => (
                  <tr key={d.id}><td>{canSell ? <Link href={`/admin/sales/${d.id}`} className="font-mono text-sm underline">{d.number}</Link> : <span className="font-mono text-sm">{d.number}</span>}</td><td>{KIND_LABELS[d.kind]}</td><td className="whitespace-nowrap">{fmtDate(d.issueDate)}</td>
                    <td className="text-end">{fmtMoney(Number(d.total))}</td><td className="text-end">{d.kind === "INVOICE" && !["DRAFT", "VOID"].includes(d.status) ? fmtMoney(Number(d.total) - Number(d.amountPaid)) : "—"}</td><td><SalesBadge status={d.status} overdue={isOverdue(d)} /></td></tr>
                ))}</tbody>
              </table></div>
            )}
          </Panel>
          {c.payments.length > 0 && (
            <Panel title="Payments received">
              <div className="overflow-x-auto"><table className="admin-table">
                <thead><tr><th>Receipt</th><th>Date</th><th>Method</th><th className="text-end">Amount</th></tr></thead>
                <tbody>{c.payments.map((p) => <tr key={p.id}><td className="font-mono text-xs">{p.number}</td><td>{fmtDate(p.date)}</td><td>{METHOD_LABELS[p.method]}</td><td className="text-end">{fmtMoney(Number(p.amount))}</td></tr>)}</tbody>
              </table></div>
            </Panel>
          )}
          <Panel title="Website activity">
            {history.length === 0 ? <Empty>No website requests.</Empty> : (
              <div className="overflow-x-auto"><table className="admin-table"><thead><tr><th>Reference</th><th>Type</th><th>Details</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>{history.map((h) => <tr key={h.id}><td><Link href={h.href} className="font-mono text-sm underline">{h.ref}</Link></td><td>{h.kind}</td><td>{h.what}</td><td className="whitespace-nowrap">{fmtDate(h.date)}</td><td><StatusBadge status={h.status} /></td></tr>)}</tbody></table></div>
            )}
          </Panel>
        </div>
        <Panel title="Details">
          <div className="mb-4"><ContactLinks email={c.email} phone={c.phone} reference={c.name} /></div>
          <form action={saveCustomer} className="space-y-4">
            <input type="hidden" name="id" value={c.id} /><input type="hidden" name="_back" value={`/admin/customers/${c.id}`} />
            <PartyFields kind="customer" v={c} />
            <button type="submit" className="btn btn-primary w-full">Save</button>
          </form>
        </Panel>
      </div>
    </>
  );
}
