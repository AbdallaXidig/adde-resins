import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { deleteCategory, saveCategory } from "../../actions/catalog";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { PageHeader, Panel } from "@/components/admin/ui";

export const metadata = { title: "Categories" };
type Tr = Record<string, { name?: string }>;

function CategoryFields({ c }: { c?: { id: string; name: string; slug: string; description: string | null; sortOrder: number; translations: unknown } }) {
  const tr = (c?.translations ?? {}) as Tr;
  return (
    <>
      {c && <input type="hidden" name="id" value={c.id} />}
      <input name="name" required defaultValue={c?.name} placeholder="Name" aria-label="Name" className="field" />
      <input name="slug" defaultValue={c?.slug} placeholder="slug (auto)" aria-label="Slug" className="field font-mono text-sm" />
      <input name="so_name" defaultValue={tr.so?.name ?? ""} placeholder="Somali name" aria-label="Somali name" className="field" />
      <input name="ar_name" defaultValue={tr.ar?.name ?? ""} placeholder="Arabic name" aria-label="Arabic name" dir="rtl" className="field" />
      <input name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 0} aria-label="Order" className="field" />
      <input name="description" defaultValue={c?.description ?? ""} placeholder="Description" aria-label="Description" className="field sm:col-span-2 lg:col-span-4" />
    </>
  );
}

export default async function Categories({ searchParams }: { searchParams: FlashParams }) {
  await requirePermission("categories");
  const sp = await searchParams;
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } });
  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title="Product categories" text="Categories group products in the catalogue filters and menu." />
      <div className="space-y-4">
        {categories.map((c) => (
          <Panel key={c.id} title={`${c.name} (${c._count.products} products)`}>
            <form action={saveCategory} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><CategoryFields c={c} />
              <button type="submit" className="btn btn-primary">Save</button>
            </form>
            {c._count.products === 0 && <form action={deleteCategory} className="mt-2"><input type="hidden" name="id" value={c.id} /><button className="text-sm text-burgundy underline">Delete category</button></form>}
          </Panel>
        ))}
        <Panel title="Add category">
          <form action={saveCategory} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><CategoryFields /><button type="submit" className="btn btn-primary">Add</button></form>
        </Panel>
      </div>
    </>
  );
}
