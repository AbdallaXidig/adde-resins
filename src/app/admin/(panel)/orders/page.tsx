import Link from "next/link";
import type { Prisma, WorkflowStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { STATUS_LABELS, WORKFLOW_STATUSES } from "@/lib/status";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { Empty, PageHeader, Pager, SearchBar, StatusBadge, fmtDate, fmtQty, pageNum } from "@/components/admin/ui";

export const metadata = { title: "Orders" };
const PER = 25;

export default async function Rfqs({ searchParams }: { searchParams: FlashParams }) {
  await requirePermission("rfqs");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = WORKFLOW_STATUSES.includes(sp.status as WorkflowStatus) ? (sp.status as WorkflowStatus) : undefined;
  const page = pageNum(sp.page);
  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ reference: { contains: q, mode: "insensitive" } }, { shippingCountry: { contains: q, mode: "insensitive" } }, { items: { some: { productName: { contains: q, mode: "insensitive" } } } }, { customer: { OR: [{ name: { contains: q, mode: "insensitive" } }, { company: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.order.findMany({ where, include: { customer: true, items: true }, orderBy: { createdAt: "desc" }, take: PER, skip: (page - 1) * PER }),
    prisma.order.count({ where }),
  ]);
  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title="Orders" text="Cart orders and cart quotation requests. No online payment is taken." />
      <SearchBar placeholder="Reference, product, customer, country" defaultValue={q}>
        <select name="status" defaultValue={status ?? ""} className="field w-auto" aria-label="Status"><option value="">All statuses</option>{WORKFLOW_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select>
      </SearchBar>
      {rows.length === 0 ? <Empty>No orders match.</Empty> : (
        <div className="card overflow-x-auto"><table className="admin-table min-w-[860px]">
          <thead><tr><th>Reference</th><th>Received</th><th>Customer</th><th>Type</th><th>Items</th><th>Destination</th><th>Status</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td><Link href={`/admin/orders/${r.id}`} className="font-mono text-sm font-semibold text-brown hover:text-orange-dark">{r.reference}</Link></td>
              <td className="whitespace-nowrap">{fmtDate(r.createdAt)}</td>
              <td>{r.customer.company ?? r.customer.name}<span className="block text-xs text-muted">{r.customer.email}</span></td>
              <td>{r.type === "ORDER" ? "Order" : "Quote request"}</td>
              <td>{r.items.map((i) => `${i.productName} (${fmtQty(i.quantity.toString(), i.unit)})`).join(", ")}</td>
              <td>{[r.shippingPort, r.shippingCountry].filter(Boolean).join(", ")}</td>
              <td><StatusBadge status={r.status} /></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      <Pager page={page} total={total} perPage={PER} params={{ q, status }} />
    </>
  );
}
