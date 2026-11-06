import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { saveSalesDoc } from "../../../../actions/finance";
import { DocumentForm } from "@/components/admin/DocumentForm";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { PageHeader } from "@/components/admin/ui";
import { customerOptions, dateInput, productOptions } from "@/components/admin/finance-ui";

export const metadata = { title: "Edit sales document" };

export default async function EditSalesDoc({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: FlashParams }) {
  await requirePermission("sales");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const doc = await prisma.salesDocument.findUnique({ where: { id }, include: { items: { orderBy: { sortOrder: "asc" } } } });
  if (!doc) notFound();
  if (doc.status !== "DRAFT") redirect(`/admin/sales/${id}?error=${encodeURIComponent("Only drafts can be edited.")}`);
  const [products, customers] = await Promise.all([productOptions(), customerOptions()]);
  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title={`Edit ${doc.number}`} text="Draft" action={<Link href={`/admin/sales/${id}`} className="btn btn-outline">Cancel</Link>} />
      <DocumentForm mode="sales" action={saveSalesDoc} products={products} parties={customers} back={`/admin/sales/${id}/edit`} submitLabel="Save draft"
        initial={{
          id, kind: doc.kind, partyId: doc.customerId, issueDate: dateInput(doc.issueDate), dueDate: dateInput(doc.dueDate),
          discount: Number(doc.discount), shipping: Number(doc.shipping), tax: Number(doc.tax),
          shipTo: doc.shipTo ?? "", notes: doc.notes ?? "", internalNotes: doc.internalNotes ?? "",
          lines: doc.items.map((i) => ({ productId: i.productId ?? undefined, description: i.description, grade: i.grade ?? "", quantity: Number(i.quantity), unit: i.unit, price: Number(i.unitPrice) })),
        }} />
    </>
  );
}
