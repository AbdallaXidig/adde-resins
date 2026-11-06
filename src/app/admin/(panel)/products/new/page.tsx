import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { createProduct } from "../../../actions/catalog";
import { ProductForm } from "@/components/admin/ProductForm";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Add product" };

export default async function NewProduct({ searchParams }: { searchParams: FlashParams }) {
  const user = await requirePermission("products");
  const sp = await searchParams;
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <>
      <Flash error={sp.error} />
      <PageHeader title="Add product" text="New products start as drafts, hidden until you publish them." />
      <ProductForm categories={categories} action={createProduct} canPrice={user.role === "SUPER_ADMIN" || user.role === "MANAGER"} />
    </>
  );
}
