import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { INQUIRY_LABELS, INQUIRY_STATUSES } from "@/lib/status";
import { setInquiryStatus } from "../../../actions/workflow";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { ContactLinks } from "@/components/admin/StatusForm";
import { PageHeader, Panel, StatusBadge, fmtDateTime } from "@/components/admin/ui";

export const metadata = { title: "Inquiry" };

export default async function InquiryDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: FlashParams }) {
  await requirePermission("inquiries");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const q = await prisma.inquiry.findUnique({ where: { id } });
  if (!q) notFound();
  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title={q.reference} text={`${q.category} · ${fmtDateTime(q.createdAt)}`} action={<div className="flex items-center gap-3"><StatusBadge status={q.status} /><Link href="/admin/inquiries" className="btn btn-outline">Back</Link></div>} />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title={q.subject || "Message"}>
          <p className="whitespace-pre-line">{q.message}</p>
          <div className="mt-5 border-t border-line pt-4 text-sm">
            <p className="font-semibold">{q.customerId ? <Link className="underline" href={`/admin/customers/${q.customerId}`}>{q.name}</Link> : q.name}</p>
            <p>{[q.company, q.country].filter(Boolean).join(" · ")}</p><p>{q.email}{q.phone && ` · ${q.phone}`}</p>
            <div className="mt-3"><ContactLinks email={q.email} phone={q.phone} reference={q.reference} /></div>
          </div>
        </Panel>
        <Panel title="Update">
          <form action={setInquiryStatus} className="space-y-3">
            <input type="hidden" name="id" value={q.id} />
            <div><label htmlFor="status" className="field-label">Status</label><select id="status" name="status" defaultValue={q.status} className="field">{INQUIRY_STATUSES.map((s) => <option key={s} value={s}>{INQUIRY_LABELS[s]}</option>)}</select></div>
            <div><label htmlFor="adminNotes" className="field-label">Internal notes</label><textarea id="adminNotes" name="adminNotes" rows={5} defaultValue={q.adminNotes ?? ""} className="field" /></div>
            <button type="submit" className="btn btn-primary w-full">Save</button>
          </form>
        </Panel>
      </div>
    </>
  );
}
