import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { setRfqStatus } from "../../../actions/workflow";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { ContactLinks, StatusForm, Timeline } from "@/components/admin/StatusForm";
import { PageHeader, Panel, StatusBadge, fmtDate, fmtQty } from "@/components/admin/ui";

export const metadata = { title: "Quotation request" };

export default async function RfqDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: FlashParams }) {
  await requirePermission("rfqs");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const rfq = await prisma.rfq.findUnique({ where: { id }, include: { customer: true, product: true, statusEvents: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } } } });
  if (!rfq) notFound();
  const rows: [string, React.ReactNode][] = [
    ["Product", rfq.product ? <Link href={`/admin/products/${rfq.product.id}`} className="underline">{rfq.productName}</Link> : rfq.productName],
    ["Grade", rfq.grade ?? "Any / not sure"],
    ["Quantity", fmtQty(rfq.quantity.toString(), rfq.unit)],
    ["Packaging", rfq.packaging ?? "To discuss"],
    ["Destination", `${rfq.destinationPort}, ${rfq.destinationCountry}`],
    ["Required delivery", fmtDate(rfq.deliveryDate)],
    ["Language", rfq.locale.toUpperCase()],
    ["Received", fmtDate(rfq.createdAt)],
  ];
  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title={rfq.reference} text="Quotation request" action={<div className="flex items-center gap-3"><StatusBadge status={rfq.status} /><Link href="/admin/rfqs" className="btn btn-outline">Back</Link></div>} />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Panel title="Request">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{rows.map(([k, v]) => <div key={k}><dt className="text-sm text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>)}</dl>
            {rfq.requirements && <div className="mt-4 border-t border-line pt-4"><p className="text-sm text-muted">Additional requirements</p><p className="mt-1 whitespace-pre-line">{rfq.requirements}</p></div>}
          </Panel>
          <Panel title="Customer">
            <p className="font-semibold"><Link href={`/admin/customers/${rfq.customer.id}`} className="underline">{rfq.customer.name}</Link></p>
            <p className="text-sm">{rfq.customer.company}</p>
            <p className="text-sm">{rfq.customer.email}{rfq.customer.phone && ` · ${rfq.customer.phone}`}</p>
            <div className="mt-3"><ContactLinks email={rfq.customer.email} phone={rfq.customer.phone} reference={rfq.reference} /></div>
          </Panel>
          <Panel title="Timeline"><Timeline events={rfq.statusEvents} /></Panel>
        </div>
        <Panel title="Update status"><StatusForm id={rfq.id} status={rfq.status} adminNotes={rfq.adminNotes} action={setRfqStatus} hint="Typical flow: Under Review → Quotation Sent → Confirmed." /></Panel>
      </div>
    </>
  );
}
