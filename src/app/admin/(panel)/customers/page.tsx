import Link from "next/link";
import type { CustomerSource, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { saveCustomer } from "../../actions/finance";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { CUSTOMER_SOURCES, PartyFields, SOURCE_LABELS } from "@/components/admin/PartyFields";
import { Empty, PageHeader, Pager, Panel, SearchBar, fmtDate, fmtMoney, pageNum } from "@/components/admin/ui";

export const metadata = { title: "Customers" };
const PER = 30;

export default async function Customers({ searchParams }: { searchParams: FlashParams }) {
  await requirePermission("customers");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const source = (CUSTOMER_SOURCES.some(([v]) => v === sp.source) ? sp.source : undefined) as CustomerSource | undefined;
  const page = pageNum(sp.page);
  const where: Prisma.CustomerWhereInput = {
    ...(source ? { source } : {}),
    ...(q ? { OR: ["name", "email", "company", "country", "phone"].map((k) => ({ [k]: { contains: q, mode: "insensitive" } })) } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.customer.findMany({ where, orderBy: { createdAt: "desc" }, take: PER, skip: (page - 1) * PER, include: { _count: { select: { orders: true, rfqs: true, salesDocuments: true } } } }),
    prisma.customer.count({ where }),
  ]);
  const balances = await prisma.salesDocument.groupBy({ by: ["customerId"], where: { customerId: { in: rows.map((r) => r.id) }, kind: "INVOICE", status: { in: ["ISSUED", "PARTIALLY_PAID"] } }, _sum: { total: true, amountPaid: true } });
  const owed = new Map(balances.map((b) => [b.customerId, Number(b._sum.total ?? 0) - Number(b._sum.amountPaid ?? 0)]));
  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title="Customers" text="Everyone you sell to: website visitors are added automatically, and you can add walk-in, phone and WhatsApp customers yourself." />
      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div>
          <SearchBar placeholder="Name, phone, email, company, country" defaultValue={q}>
            <select name="source" defaultValue={source ?? ""} className="field w-auto" aria-label="Source"><option value="">Any source</option>{CUSTOMER_SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </SearchBar>
          {rows.length === 0 ? <Empty>No customers found.</Empty> : (
            <div className="card overflow-x-auto"><table className="admin-table min-w-[720px]">
              <thead><tr><th>Customer</th><th>Source</th><th>Country</th><th>Requests</th><th>Quotes / invoices</th><th className="text-end">Owes</th><th>Since</th></tr></thead>
              <tbody>{rows.map((c) => (
                <tr key={c.id}><td><Link href={`/admin/customers/${c.id}`} className="font-semibold text-brown hover:text-orange-dark">{c.name}</Link><span className="block text-xs text-muted">{[c.company, c.phone ?? c.email].filter(Boolean).join(" · ")}</span></td>
                  <td>{SOURCE_LABELS[c.source]}</td><td>{c.country ?? "—"}</td><td>{c._count.rfqs + c._count.orders}</td><td>{c._count.salesDocuments}</td>
                  <td className={`text-end ${(owed.get(c.id) ?? 0) > 0 ? "font-semibold text-burgundy" : ""}`}>{owed.get(c.id) ? fmtMoney(owed.get(c.id)) : "—"}</td>
                  <td className="whitespace-nowrap">{fmtDate(c.createdAt)}</td></tr>
              ))}</tbody>
            </table></div>
          )}
          <Pager page={page} total={total} perPage={PER} params={{ q, source }} />
        </div>
        <Panel title="Add a customer">
          <form action={saveCustomer} className="space-y-4">
            <input type="hidden" name="_back" value="/admin/customers" />
            <PartyFields kind="customer" />
            <button type="submit" className="btn btn-primary w-full">Add customer</button>
          </form>
        </Panel>
      </div>
    </>
  );
}
