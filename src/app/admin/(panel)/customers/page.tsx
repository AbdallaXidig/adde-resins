import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { Empty, PageHeader, Pager, SearchBar, fmtDate, pageNum } from "@/components/admin/ui";

export const metadata = { title: "Customers" };
const PER = 30;

export default async function Customers({ searchParams }: { searchParams: FlashParams }) {
  await requirePermission("customers");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const page = pageNum(sp.page);
  const where: Prisma.CustomerWhereInput = q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { company: { contains: q, mode: "insensitive" } }, { country: { contains: q, mode: "insensitive" } }] } : {};
  const [rows, total] = await Promise.all([
    prisma.customer.findMany({ where, orderBy: { createdAt: "desc" }, take: PER, skip: (page - 1) * PER, include: { _count: { select: { orders: true, rfqs: true, inquiries: true } } } }),
    prisma.customer.count({ where }),
  ]);
  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title="Customers" text="Created automatically from website requests, matched by email address." />
      <SearchBar placeholder="Name, email, company, country" defaultValue={q} />
      {rows.length === 0 ? <Empty>No customers yet.</Empty> : (
        <div className="card overflow-x-auto"><table className="admin-table min-w-[720px]">
          <thead><tr><th>Customer</th><th>Company</th><th>Country</th><th>RFQs</th><th>Orders</th><th>Inquiries</th><th>Since</th></tr></thead>
          <tbody>{rows.map((c) => (
            <tr key={c.id}><td><Link href={`/admin/customers/${c.id}`} className="font-semibold text-brown hover:text-orange-dark">{c.name}</Link><span className="block text-xs text-muted">{c.email}</span></td>
              <td>{c.company ?? "—"}</td><td>{c.country ?? "—"}</td><td>{c._count.rfqs}</td><td>{c._count.orders}</td><td>{c._count.inquiries}</td><td className="whitespace-nowrap">{fmtDate(c.createdAt)}</td></tr>
          ))}</tbody>
        </table></div>
      )}
      <Pager page={page} total={total} perPage={PER} params={{ q }} />
    </>
  );
}
