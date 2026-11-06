import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { saveSupplierRecord } from "../../../actions/finance";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { PartyFields } from "@/components/admin/PartyFields";
import { Empty, PageHeader, Panel, fmtDate, fmtMoney } from "@/components/admin/ui";
import { PaidBadge, PurchaseBadge, Stat } from "@/components/admin/finance-ui";

export const metadata = { title: "Supplier" };

export default async function SupplierDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: FlashParams }) {
  await requirePermission("purchases");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const s = await prisma.supplier.findUnique({ where: { id }, include: { purchases: { orderBy: { orderDate: "desc" } } } });
  if (!s) notFound();
  const live = s.purchases.filter((p) => p.status === "ORDERED" || p.status === "RECEIVED");
  const bought = live.reduce((a, p) => a + Number(p.total), 0);
  const owed = live.reduce((a, p) => a + Number(p.total) - Number(p.amountPaid), 0);
  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title={s.name} text={[s.contact, s.country].filter(Boolean).join(" · ")} action={<div className="flex gap-2"><Link href={`/admin/purchases/new?supplier=${s.id}`} className="btn btn-primary">New purchase</Link><Link href="/admin/suppliers" className="btn btn-outline">Back</Link></div>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2"><Stat label="Total bought" value={fmtMoney(bought)} /><Stat label="Still owed" value={fmtMoney(owed)} tone={owed > 0 ? "bad" : undefined} /></div>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Purchases">
          {s.purchases.length === 0 ? <Empty>No purchases from this supplier yet.</Empty> : (
            <div className="overflow-x-auto"><table className="admin-table">
              <thead><tr><th>Number</th><th>Date</th><th className="text-end">Total</th><th>Payment</th><th>Status</th></tr></thead>
              <tbody>{s.purchases.map((p) => (
                <tr key={p.id}><td><Link href={`/admin/purchases/${p.id}`} className="font-mono text-sm underline">{p.number}</Link></td><td>{fmtDate(p.orderDate)}</td><td className="text-end">{fmtMoney(Number(p.total))}</td>
                  <td>{p.status === "ORDERED" || p.status === "RECEIVED" ? <PaidBadge total={Number(p.total)} paid={Number(p.amountPaid)} /> : "—"}</td><td><PurchaseBadge status={p.status} /></td></tr>
              ))}</tbody>
            </table></div>
          )}
        </Panel>
        <Panel title="Details">
          <form action={saveSupplierRecord} className="space-y-4">
            <input type="hidden" name="id" value={s.id} /><input type="hidden" name="_back" value={`/admin/suppliers/${s.id}`} />
            <PartyFields kind="supplier" v={s} />
            <label className="flex items-center gap-2 text-sm"><input type="hidden" name="active" value="off" /><input type="checkbox" name="active" value="on" defaultChecked={s.active} /> Active (shown when creating purchases)</label>
            <button type="submit" className="btn btn-primary w-full">Save</button>
          </form>
        </Panel>
      </div>
    </>
  );
}
