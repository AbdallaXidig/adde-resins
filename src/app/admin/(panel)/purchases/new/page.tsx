import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { savePurchaseAction } from "../../../actions/finance";
import { DocumentForm } from "@/components/admin/DocumentForm";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { PageHeader } from "@/components/admin/ui";
import { productOptions, supplierOptions, todayInput } from "@/components/admin/finance-ui";

export const metadata = { title: "New purchase" };

export default async function NewPurchase({ searchParams }: { searchParams: FlashParams }) {
  await requirePermission("purchases");
  const sp = await searchParams;
  const [products, suppliers] = await Promise.all([productOptions(), supplierOptions()]);
  const supplier = typeof sp.supplier === "string" && suppliers.some((s) => s.id === sp.supplier) ? sp.supplier : undefined;
  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title="New purchase" text="Saved as a draft. Mark it ordered when you commit, and received when the goods arrive." action={<Link href="/admin/purchases" className="btn btn-outline">Cancel</Link>} />
      <DocumentForm mode="purchase" action={savePurchaseAction} products={products} parties={suppliers} back="/admin/purchases/new" submitLabel="Save draft"
        initial={{ partyId: supplier, orderDate: todayInput(), shipping: 0, otherCosts: 0, lines: [] }} />
    </>
  );
}
