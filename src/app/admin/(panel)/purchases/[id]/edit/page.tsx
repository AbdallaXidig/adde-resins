import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { savePurchaseAction } from "../../../../actions/finance";
import { DocumentForm } from "@/components/admin/DocumentForm";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { PageHeader } from "@/components/admin/ui";
import { dateInput, productOptions, supplierOptions } from "@/components/admin/finance-ui";

export const metadata = { title: "Edit purchase" };

export default async function EditPurchase({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: FlashParams }) {
  await requirePermission("purchases");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const p = await prisma.purchase.findUnique({ where: { id }, include: { items: { orderBy: { sortOrder: "asc" } } } });
  if (!p) notFound();
  if (p.status === "RECEIVED" || p.status === "CANCELLED") redirect(`/admin/purchases/${id}?error=${encodeURIComponent("Received or cancelled purchases can't be edited.")}`);
  const [products, suppliers] = await Promise.all([productOptions(), supplierOptions()]);
  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title={`Edit ${p.number}`} action={<Link href={`/admin/purchases/${id}`} className="btn btn-outline">Cancel</Link>} />
      <DocumentForm mode="purchase" action={savePurchaseAction} products={products} parties={suppliers} back={`/admin/purchases/${id}/edit`} submitLabel="Save"
        initial={{
          id, partyId: p.supplierId, orderDate: dateInput(p.orderDate), expectedDate: dateInput(p.expectedDate), supplierRef: p.supplierRef ?? "",
          shipping: Number(p.shipping), otherCosts: Number(p.otherCosts), notes: p.notes ?? "",
          lines: p.items.map((i) => ({ productId: i.productId ?? undefined, description: i.description, grade: i.grade ?? "", quantity: Number(i.quantity), unit: i.unit, price: Number(i.unitCost) })),
        }} />
    </>
  );
}
