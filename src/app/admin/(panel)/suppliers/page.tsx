import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { saveSupplierRecord } from "../../actions/finance";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { PartyFields } from "@/components/admin/PartyFields";
import { Empty, PageHeader, Panel, fmtMoney } from "@/components/admin/ui";

export const metadata = { title: "Suppliers" };

export default async function Suppliers({ searchParams }: { searchParams: FlashParams }) {
  await requirePermission("purchases");
  const sp = await searchParams;
  const [suppliers, totals] = await Promise.all([
    prisma.supplier.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }], include: { _count: { select: { purchases: true } } } }),
    prisma.purchase.groupBy({ by: ["supplierId"], where: { status: { in: ["ORDERED", "RECEIVED"] } }, _sum: { total: true, amountPaid: true } }),
  ]);
  const owed = new Map(totals.map((t) => [t.supplierId, Number(t._sum.total ?? 0) - Number(t._sum.amountPaid ?? 0)]));
  const bought = new Map(totals.map((t) => [t.supplierId, Number(t._sum.total ?? 0)]));
  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title="Suppliers" text="Who you buy resin, packaging and services from." action={<Link href="/admin/purchases/new" className="btn btn-primary">New purchase</Link>} />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div>{suppliers.length === 0 ? <Empty>No suppliers yet. Add one with the form.</Empty> : (
          <div className="card overflow-x-auto"><table className="admin-table min-w-[640px]">
            <thead><tr><th>Supplier</th><th>Country</th><th>Phone</th><th>Purchases</th><th className="text-end">Bought</th><th className="text-end">Owed</th></tr></thead>
            <tbody>{suppliers.map((s) => (
              <tr key={s.id} className={s.active ? "" : "opacity-60"}>
                <td><Link href={`/admin/suppliers/${s.id}`} className="font-semibold text-brown underline">{s.name}</Link>{s.contact && <span className="block text-xs text-muted">{s.contact}</span>}</td>
                <td>{s.country ?? "—"}</td><td dir="ltr">{s.phone ?? "—"}</td><td>{s._count.purchases}</td>
                <td className="text-end">{fmtMoney(bought.get(s.id) ?? 0)}</td>
                <td className={`text-end ${(owed.get(s.id) ?? 0) > 0 ? "font-semibold text-burgundy" : ""}`}>{fmtMoney(owed.get(s.id) ?? 0)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}</div>
        <Panel title="Add a supplier">
          <form action={saveSupplierRecord} className="space-y-4">
            <input type="hidden" name="_back" value="/admin/suppliers" />
            <PartyFields kind="supplier" />
            <button type="submit" className="btn btn-primary w-full">Add supplier</button>
          </form>
        </Panel>
      </div>
    </>
  );
}
