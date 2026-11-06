import Link from "next/link";
import Image from "next/image";
import type { Prisma, PublishStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { Empty, PageHeader, SearchBar } from "@/components/admin/ui";

export const metadata = { title: "Products" };

export default async function ProductsAdmin({ searchParams }: { searchParams: FlashParams }) {
  await requirePermission("products");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(String(sp.status)) ? (sp.status as PublishStatus) : undefined;
  const where: Prisma.ProductWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { botanicalName: { contains: q, mode: "insensitive" } }, { slug: { contains: q } }] } : {}),
  };
  const products = await prisma.product.findMany({ where, include: { category: true, images: { take: 1, orderBy: { sortOrder: "asc" } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title="Products" text="Manage the catalogue, specifications, images and translations." action={<Link href="/admin/products/new" className="btn btn-primary">Add product</Link>} />
      <SearchBar placeholder="Search name or botanical name" defaultValue={q}>
        <select name="status" defaultValue={status ?? ""} className="field w-auto" aria-label="Status">
          <option value="">All statuses</option><option value="PUBLISHED">Published</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option>
        </select>
      </SearchBar>
      {products.length === 0 ? <Empty>No products found.</Empty> : (
        <div className="card overflow-x-auto">
          <table className="admin-table min-w-[760px]">
            <thead><tr><th></th><th>Product</th><th>Category</th><th>Status</th><th>Availability</th><th>Flags</th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="w-16">{p.images[0] ? <Image src={p.images[0].url} alt="" width={56} height={42} className="h-[42px] w-14 rounded object-cover" /> : <span className="block h-[42px] w-14 rounded bg-sand" />}</td>
                  <td><Link href={`/admin/products/${p.id}`} className="font-semibold text-brown hover:text-orange-dark">{p.name}</Link><span className="block text-xs italic text-muted">{p.botanicalName}</span></td>
                  <td>{p.category.name}</td>
                  <td><span className={`chip ${p.status === "PUBLISHED" ? "chip-ok" : p.status === "DRAFT" ? "chip-warn" : ""}`}>{p.status.toLowerCase()}</span></td>
                  <td>{p.availability.replaceAll("_", " ").toLowerCase()}</td>
                  <td className="space-x-1">{p.isDemo && <span className="chip chip-demo">sample</span>}{p.verified && <span className="chip chip-ok">verified</span>}{p.featured && <span className="chip">featured</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
