import Link from "next/link";
import type { Prisma, PurchaseStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { Empty, PageHeader, Pager, SearchBar, fmtDate, fmtMoney, pageNum } from "@/components/admin/ui";
import { PURCHASE_STATUS_LABELS, PaidBadge, PurchaseBadge, Stat } from "@/components/admin/finance-ui";

export const metadata = { title: "Purchases" };
const PER = 30;

export default async function Purchases({ searchParams }: { searchParams: FlashParams }) {
  await requirePermission("purchases");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = (Object.keys(PURCHASE_STATUS_LABELS).includes(String(sp.status)) ? sp.status : undefined) as PurchaseStatus | undefined;
  const page = pageNum(sp.page);
  const where: Prisma.PurchaseWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ number: { contains: q, mode: "insensitive" } }, { supplierRef: { contains: q, mode: "insensitive" } }, { supplier: { name: { contains: q, mode: "insensitive" } } }] } : {}),
  };
  const [rows, total, open] = await Promise.all([
    prisma.purchase.findMany({ where, orderBy: [{ orderDate: "desc" }, { createdAt: "desc" }], take: PER, skip: (page - 1) * PER, include: { supplier: { select: { name: true } } } }),
    prisma.purchase.count({ where }),
    prisma.purchase.findMany({ where: { status: { in: ["ORDERED", "RECEIVED"] } }, select: { total: true, amountPaid: true, status: true } }),
  ]);
  const owed = open.reduce((s, p) => s + Number(p.total) - Number(p.amountPaid), 0);
  const awaiting = open.filter((p) => p.status === "ORDERED");
  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title="Purchases" text="What you buy from suppliers. Receiving a purchase adds its goods to stock."
        action={<div className="flex flex-wrap gap-2"><Link href="/admin/suppliers" className="btn btn-outline">Suppliers</Link><Link href="/admin/purchases/new" className="btn btn-primary">New purchase</Link></div>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Stat label="Owed to suppliers" value={fmtMoney(owed)} tone={owed > 0 ? "bad" : undefined} href="/admin/accounting#payables" />
        <Stat label="Ordered, not yet received" value={String(awaiting.length)} href="/admin/purchases?status=ORDERED" />
      </div>
      <SearchBar placeholder="Number, supplier or their reference" defaultValue={q}>
        <select name="status" defaultValue={status ?? ""} className="field w-auto" aria-label="Status"><option value="">Any status</option>{Object.entries(PURCHASE_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </SearchBar>
      {rows.length === 0 ? <Empty>No purchases yet.</Empty> : (
        <div className="card overflow-x-auto"><table className="admin-table min-w-[760px]">
          <thead><tr><th>Number</th><th>Supplier</th><th>Order date</th><th className="text-end">Total</th><th className="text-end">Owed</th><th>Payment</th><th>Status</th></tr></thead>
          <tbody>{rows.map((p) => (
            <tr key={p.id}>
              <td><Link href={`/admin/purchases/${p.id}`} className="font-mono text-sm font-semibold text-brown underline">{p.number}</Link>{p.supplierRef && <span className="block text-xs text-muted">Ref {p.supplierRef}</span>}</td>
              <td>{p.supplier.name}</td><td className="whitespace-nowrap">{fmtDate(p.orderDate)}</td>
              <td className="whitespace-nowrap text-end">{fmtMoney(Number(p.total))}</td>
              <td className="whitespace-nowrap text-end">{p.status === "CANCELLED" || p.status === "DRAFT" ? "—" : fmtMoney(Number(p.total) - Number(p.amountPaid))}</td>
              <td>{p.status === "CANCELLED" || p.status === "DRAFT" ? "—" : <PaidBadge total={Number(p.total)} paid={Number(p.amountPaid)} />}</td>
              <td><PurchaseBadge status={p.status} /></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      <Pager page={page} total={total} perPage={PER} params={{ q, status }} />
    </>
  );
}
