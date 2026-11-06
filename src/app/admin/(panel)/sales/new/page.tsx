import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { saveSalesDoc } from "../../../actions/finance";
import { DocumentForm } from "@/components/admin/DocumentForm";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { PageHeader } from "@/components/admin/ui";
import { addDays, customerOptions, productOptions, todayInput } from "@/components/admin/finance-ui";

export const metadata = { title: "New sales document" };

export default async function NewSalesDoc({ searchParams }: { searchParams: FlashParams }) {
  await requirePermission("sales");
  const sp = await searchParams;
  const kind = sp.kind === "QUOTATION" ? "QUOTATION" : "INVOICE";
  const [products, customers] = await Promise.all([productOptions(), customerOptions()]);
  const customer = typeof sp.customer === "string" && customers.some((c) => c.id === sp.customer) ? sp.customer : undefined;
  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title={kind === "QUOTATION" ? "New quotation" : "New invoice"} text="Saved as a draft first. You can check it, then send or issue it." action={<Link href="/admin/sales" className="btn btn-outline">Cancel</Link>} />
      <DocumentForm mode="sales" action={saveSalesDoc} products={products} parties={customers} back={`/admin/sales/new?kind=${kind}`} submitLabel="Save draft"
        initial={{ kind, partyId: customer, issueDate: todayInput(), dueDate: addDays(kind === "QUOTATION" ? 14 : 30), discount: 0, shipping: 0, tax: 0, lines: [] }} />
    </>
  );
}
