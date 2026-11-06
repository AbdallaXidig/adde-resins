import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { saveResearch, saveSupplier } from "../../actions/research";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { Empty, PageHeader, Panel, fmtDate, fmtMoney } from "@/components/admin/ui";

export const metadata = { title: "Product research" };

export default async function Research({ searchParams }: { searchParams: FlashParams }) {
  await requirePermission("research");
  const sp = await searchParams;
  const [suppliers, entries, products] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.researchEntry.findMany({ orderBy: { updatedAt: "desc" }, include: { product: true, supplier: true } }),
    prisma.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title="Product research" text="Internal only, never shown on the website. Record verified product information, supplier details, source references and purchase costs here before publishing anything." />
      <p className="mb-6 rounded-lg bg-sand px-4 py-3 text-sm text-muted">Reference websites are for research only. Do not copy other companies’ text, photos, prices or branding into the catalogue. Supplier data feeds are not connected and can be added later as an optional integration.</p>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Research entries">
          {entries.length === 0 ? <Empty>No research entries yet.</Empty> : (
            <div className="overflow-x-auto"><table className="admin-table min-w-[680px]">
              <thead><tr><th>Title</th><th>Product</th><th>Supplier</th><th>Cost</th><th>Status</th><th>Updated</th></tr></thead>
              <tbody>{entries.map((e) => (
                <tr key={e.id}><td>{e.sourceUrl ? <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{e.title}</a> : e.title}<span className="block text-xs text-muted">{[e.botanicalName, e.grade].filter(Boolean).join(" · ")}</span></td>
                  <td>{e.product?.name ?? "—"}</td><td>{e.supplier?.name ?? "—"}</td><td className="whitespace-nowrap">{e.purchaseCost ? `${fmtMoney(Number(e.purchaseCost), e.costCurrency)} / ${e.costUnit}` : "—"}</td>
                  <td><span className={`chip ${e.status === "VERIFIED" ? "chip-ok" : e.status === "REJECTED" ? "chip-bad" : "chip-warn"}`}>{e.status.toLowerCase()}</span>{e.verifiedBy && <span className="block text-xs text-muted">{e.verifiedBy}</span>}</td>
                  <td className="whitespace-nowrap">{fmtDate(e.updatedAt)}</td></tr>
              ))}</tbody>
            </table></div>
          )}
          <h3 className="mb-3 mt-6 text-lg font-semibold">Add research entry</h3>
          <form action={saveResearch} className="grid gap-3 sm:grid-cols-2">
            <input name="title" required placeholder="Title, e.g. 2026 Maydi grade sample" aria-label="Title" className="field sm:col-span-2" />
            <select name="productId" aria-label="Product" className="field"><option value="">Product (optional)</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <select name="supplierId" aria-label="Supplier" className="field"><option value="">Supplier (optional)</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <input name="botanicalName" placeholder="Botanical name" aria-label="Botanical name" className="field" />
            <input name="grade" placeholder="Grade" aria-label="Grade" className="field" />
            <div className="flex gap-2"><input name="purchaseCost" type="number" min="0" step="0.01" placeholder="Purchase cost" aria-label="Purchase cost" className="field" /><input name="costCurrency" defaultValue="USD" maxLength={3} aria-label="Currency" className="field w-20" /><select name="costUnit" aria-label="Cost unit" className="field w-20"><option>KG</option><option>MT</option></select></div>
            <input name="sourceUrl" type="url" placeholder="Source reference URL" aria-label="Source URL" className="field" />
            <textarea name="specNotes" rows={3} placeholder="Specification notes, lab results, documents seen" aria-label="Specification notes" className="field sm:col-span-2" />
            <select name="status" aria-label="Verification" className="field"><option value="UNVERIFIED">Unverified</option><option value="VERIFIED">Verified</option><option value="REJECTED">Rejected</option></select>
            <button type="submit" className="btn btn-primary">Add entry</button>
          </form>
        </Panel>
        <Panel title="Suppliers">
          {suppliers.length === 0 ? <Empty>No suppliers yet.</Empty> : (
            <ul className="mb-5 divide-y divide-line">{suppliers.map((s) => (
              <li key={s.id} className="py-2.5 text-sm"><p className="font-semibold">{s.name}{!s.active && <span className="chip ms-2">inactive</span>}</p><p className="text-muted">{[s.country, s.contact, s.email, s.phone].filter(Boolean).join(" · ")}</p>{s.notes && <p className="text-xs">{s.notes}</p>}</li>
            ))}</ul>
          )}
          <form action={saveSupplier} className="grid gap-3">
            <input name="name" required placeholder="Supplier name" aria-label="Supplier name" className="field" />
            <input name="country" placeholder="Country / region" aria-label="Country" className="field" />
            <input name="contact" placeholder="Contact person" aria-label="Contact person" className="field" />
            <input name="email" type="email" placeholder="Email" aria-label="Email" className="field" />
            <input name="phone" placeholder="Phone" aria-label="Phone" className="field" />
            <input name="website" type="url" placeholder="Website" aria-label="Website" className="field" />
            <textarea name="notes" rows={2} placeholder="Notes" aria-label="Notes" className="field" />
            <button type="submit" className="btn btn-primary">Add supplier</button>
          </form>
        </Panel>
      </div>
    </>
  );
}
