import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { deleteProduct, updateProduct } from "../../../actions/catalog";
import { ProductForm } from "@/components/admin/ProductForm";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: FlashParams }) {
  const user = await requirePermission("products");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: { images: { orderBy: { sortOrder: "asc" } }, specs: { orderBy: { sortOrder: "asc" } } } }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!product) notFound();
  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title={product.name} text={`/products/${product.slug}`} action={
        <div className="flex gap-2">
          {product.status === "PUBLISHED" && <a href={`/products/${product.slug}`} target="_blank" className="btn btn-outline"><ExternalLink size={16} aria-hidden />View</a>}
          <Link href="/admin/products" className="btn btn-outline">Back</Link>
        </div>
      } />
      <ProductForm product={product} categories={categories} action={updateProduct} canPrice={user.role === "SUPER_ADMIN" || user.role === "MANAGER"} />
      <form action={deleteProduct} className="mt-10 border-t border-line pt-6">
        <input type="hidden" name="id" value={product.id} />
        <p className="text-sm text-muted">Deleting removes the product permanently. Products with orders or quotation requests are archived instead.</p>
        <button type="submit" className="btn mt-3 border border-burgundy text-burgundy hover:bg-burgundy hover:text-white">Delete product</button>
      </form>
    </>
  );
}
