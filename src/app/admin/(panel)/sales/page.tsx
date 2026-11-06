import Link from "next/link";
import type { Prisma, SalesDocKind, SalesDocStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { Empty, PageHeader, Pager, SearchBar, fmtDate, fmtMoney, pageNum } from "@/components/admin/ui";
import { KIND_LABELS, SALES_STATUS_LABELS, SalesBadge, Stat, isOverdue } from "@/components/admin/finance-ui";

export const metadata = { title: "Sales" };
const PER = 30;

export default async function Sales({ searchParams }: { searchParams: FlashParams }) {
  await requirePermission("sales");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const kind = (["QUOTATION", "INVOICE"].includes(String(sp.kind)) ? sp.kind : undefined) as SalesDocKind | undefined;
  const status = (Object.keys(SALES_STATUS_LABELS).includes(String(sp.status)) ? sp.status : undefined) as SalesDocStatus | undefined;
  const page = pageNum(sp.page);
  const where: Prisma.SalesDocumentWhereInput = {
    ...(kind ? { kind } : {}), ...(status ? { status } : {}),
    ...(q ? { OR: [{ number: { contains: q, mode: "insensitive" } }, { customer: { name: { contains: q, mode: "insensitive" } } }, { customer: { company: { contains: q, mode: "insensitive" } } }] } : {}),
  };
  const [rows, total, open] = await Promise.all([
    prisma.salesDocument.findMany({ where, orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }], take: PER, skip: (page - 1) * PER, include: { customer: { select: { name: true, company: true } } } }),
    prisma.salesDocument.count({ where }),
    prisma.salesDocument.findMany({ where: { kind: "INVOICE", status: { in: ["ISSUED", "PARTIALLY_PAID"] } }, select: { total: true, amountPaid: true, dueDate: true, kind: true, status: true } }),
  ]);
  const owed = open.reduce((s, d) => s + Number(d.total) - Number(d.amountPaid), 0);
  const overdue = open.filter(isOverdue);
  const overdueSum = overdue.reduce((s, d) => s + Number(d.total) - Number(d.amountPaid), 0);
  const openQuotes = await prisma.salesDocument.aggregate({ where: { kind: "QUOTATION", status: { in: ["DRAFT", "SENT"] } }, _sum: { total: true }, _count: true });

  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title="Sales" text="Quotations and invoices for every customer: website, walk-in, phone or WhatsApp."
        action={<div className="flex flex-wrap gap-2"><Link href="/admin/sales/new?kind=QUOTATION" className="btn btn-outline">New quotation</Link><Link href="/admin/sales/new?kind=INVOICE" className="btn btn-primary">New invoice</Link></div>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label={`Open quotations (${openQuotes._count})`} value={fmtMoney(Number(openQuotes._sum.total ?? 0))} href="/admin/sales?kind=QUOTATION&status=SENT" />
        <Stat label={`Unpaid invoices (${open.length})`} value={fmtMoney(owed)} href="/admin/sales?kind=INVOICE&status=ISSUED" />
        <Stat label={`Overdue (${overdue.length})`} value={fmtMoney(overdueSum)} tone={overdue.length ? "bad" : undefined} href="/admin/accounting#receivables" />
      </div>
      <SearchBar placeholder="Number or customer" defaultValue={q}>
        <select name="kind" defaultValue={kind ?? ""} className="field w-auto" aria-label="Type"><option value="">Quotations and invoices</option><option value="QUOTATION">Quotations</option><option value="INVOICE">Invoices</option></select>
        <select name="status" defaultValue={status ?? ""} className="field w-auto" aria-label="Status"><option value="">Any status</option>{Object.entries(SALES_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </SearchBar>
      {rows.length === 0 ? <Empty>No quotations or invoices yet. Create one with the buttons above.</Empty> : (
        <div className="card overflow-x-auto"><table className="admin-table min-w-[820px]">
          <thead><tr><th>Number</th><th>Type</th><th>Customer</th><th>Date</th><th>Due / valid</th><th className="text-end">Total</th><th className="text-end">Balance</th><th>Status</th></tr></thead>
          <tbody>{rows.map((d) => {
            const balance = Number(d.total) - Number(d.amountPaid);
            return (
              <tr key={d.id}>
                <td><Link href={`/admin/sales/${d.id}`} className="font-mono text-sm font-semibold text-brown underline">{d.number}</Link></td>
                <td>{KIND_LABELS[d.kind]}</td>
                <td>{d.customer.company ?? d.customer.name}{d.customer.company && <span className="block text-xs text-muted">{d.customer.name}</span>}</td>
                <td className="whitespace-nowrap">{fmtDate(d.issueDate)}</td>
                <td className="whitespace-nowrap">{fmtDate(d.dueDate)}</td>
                <td className="whitespace-nowrap text-end">{fmtMoney(Number(d.total))}</td>
                <td className="whitespace-nowrap text-end">{d.kind === "INVOICE" && d.status !== "VOID" && d.status !== "DRAFT" ? fmtMoney(balance) : "—"}</td>
                <td><SalesBadge status={d.status} overdue={isOverdue(d)} /></td>
              </tr>
            );
          })}</tbody>
        </table></div>
      )}
      <Pager page={page} total={total} perPage={PER} params={{ q, kind, status }} />
    </>
  );
}
