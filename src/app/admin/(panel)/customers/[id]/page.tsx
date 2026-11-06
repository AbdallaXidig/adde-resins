import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { updateCustomer } from "../../../actions/workflow";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { Empty, PageHeader, Panel, StatusBadge, fmtDate, fmtQty } from "@/components/admin/ui";

export const metadata = { title: "Customer" };

export default async function CustomerDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: FlashParams }) {
  await requirePermission("customers");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const c = await prisma.customer.findUnique({ where: { id }, include: {
    rfqs: { orderBy: { createdAt: "desc" } }, orders: { orderBy: { createdAt: "desc" }, include: { items: true } }, inquiries: { orderBy: { createdAt: "desc" } },
  } });
  if (!c) notFound();
  const history = [
    ...c.rfqs.map((r) => ({ id: r.id, href: `/admin/rfqs/${r.id}`, ref: r.reference, kind: "RFQ", what: `${r.productName} · ${fmtQty(r.quantity.toString(), r.unit)}`, date: r.createdAt, status: r.status })),
    ...c.orders.map((o) => ({ id: o.id, href: `/admin/orders/${o.id}`, ref: o.reference, kind: o.type === "ORDER" ? "Order" : "Cart quote", what: o.items.map((i) => i.productName).join(", "), date: o.createdAt, status: o.status })),
    ...c.inquiries.map((q) => ({ id: q.id, href: `/admin/inquiries/${q.id}`, ref: q.reference, kind: "Inquiry", what: q.category, date: q.createdAt, status: q.status })),
  ].sort((a, b) => +b.date - +a.date);
  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title={c.name} text={c.email} action={<Link href="/admin/customers" className="btn btn-outline">Back</Link>} />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="History">
          {history.length === 0 ? <Empty>No activity.</Empty> : (
            <div className="overflow-x-auto"><table className="admin-table"><thead><tr><th>Reference</th><th>Type</th><th>Details</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>{history.map((h) => <tr key={h.id}><td><Link href={h.href} className="font-mono text-sm underline">{h.ref}</Link></td><td>{h.kind}</td><td>{h.what}</td><td className="whitespace-nowrap">{fmtDate(h.date)}</td><td><StatusBadge status={h.status} /></td></tr>)}</tbody></table></div>
          )}
        </Panel>
        <Panel title="Details">
          <form action={updateCustomer} className="space-y-3">
            <input type="hidden" name="id" value={c.id} /><input type="hidden" name="_back" value={`/admin/customers/${c.id}`} />
            {([["name", "Name", c.name], ["company", "Company", c.company], ["phone", "Phone", c.phone], ["country", "Country", c.country]] as const).map(([n, l, v]) => (
              <div key={n}><label htmlFor={n} className="field-label">{l}</label><input id={n} name={n} defaultValue={v ?? ""} className="field" /></div>
            ))}
            <div><label htmlFor="notes" className="field-label">Internal notes</label><textarea id="notes" name="notes" rows={4} defaultValue={c.notes ?? ""} className="field" /></div>
            <button type="submit" className="btn btn-primary w-full">Save</button>
          </form>
        </Panel>
      </div>
    </>
  );
}
