import Link from "next/link";
import type { InquiryStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { INQUIRY_LABELS, INQUIRY_STATUSES } from "@/lib/status";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { Empty, PageHeader, Pager, SearchBar, StatusBadge, fmtDate, pageNum } from "@/components/admin/ui";

export const metadata = { title: "Inquiries" };
const PER = 25;

export default async function Inquiries({ searchParams }: { searchParams: FlashParams }) {
  await requirePermission("inquiries");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = INQUIRY_STATUSES.includes(sp.status as InquiryStatus) ? (sp.status as InquiryStatus) : undefined;
  const page = pageNum(sp.page);
  const where: Prisma.InquiryWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ reference: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { company: { contains: q, mode: "insensitive" } }, { message: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [rows, total] = await Promise.all([prisma.inquiry.findMany({ where, orderBy: { createdAt: "desc" }, take: PER, skip: (page - 1) * PER }), prisma.inquiry.count({ where })]);
  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title="Inquiries" text="Messages from the contact and homepage forms." />
      <SearchBar placeholder="Reference, name, email, message" defaultValue={q}>
        <select name="status" defaultValue={status ?? ""} className="field w-auto" aria-label="Status"><option value="">All statuses</option>{INQUIRY_STATUSES.map((s) => <option key={s} value={s}>{INQUIRY_LABELS[s]}</option>)}</select>
      </SearchBar>
      {rows.length === 0 ? <Empty>No inquiries match.</Empty> : (
        <div className="card overflow-x-auto"><table className="admin-table min-w-[760px]">
          <thead><tr><th>Reference</th><th>Received</th><th>From</th><th>Type</th><th>Message</th><th>Status</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <td><Link href={`/admin/inquiries/${r.id}`} className="font-mono text-sm font-semibold text-brown hover:text-orange-dark">{r.reference}</Link></td>
              <td className="whitespace-nowrap">{fmtDate(r.createdAt)}</td>
              <td>{r.name}<span className="block text-xs text-muted">{r.email}</span></td>
              <td>{r.category}</td>
              <td className="max-w-xs truncate">{r.message}</td>
              <td><StatusBadge status={r.status} /></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      <Pager page={page} total={total} perPage={PER} params={{ q, status }} />
    </>
  );
}
