import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { updateInventory } from "../../actions/catalog";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { Empty, PageHeader, Panel, fmtDateTime } from "@/components/admin/ui";

export const metadata = { title: "Inventory & pricing" };

export default async function Inventory({ searchParams }: { searchParams: FlashParams }) {
  const user = await requirePermission("inventory");
  const sp = await searchParams;
  const canPrice = user.role === "SUPER_ADMIN" || user.role === "MANAGER";
  const [products, movements] = await Promise.all([
    prisma.product.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: [{ sortOrder: "asc" }] }),
    prisma.stockMovement.findMany({ take: 25, orderBy: { createdAt: "desc" }, include: { product: { select: { name: true } } } }),
  ]);
  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title="Inventory & pricing" text="Set availability, stock and prices without editing code. Stock is deducted when an order is confirmed and returned if it is cancelled." />
      <div className="space-y-3">
        {products.map((p) => (
          <form key={p.id} action={updateInventory} className="card grid items-end gap-3 p-4 md:grid-cols-[1.4fr_1fr_1.2fr_1fr_auto]">
            <input type="hidden" name="id" value={p.id} />
            <div><p className="font-semibold text-brown">{p.name}</p><p className="text-xs text-muted">{p.status.toLowerCase()}{p.isDemo ? " · sample data" : ""}</p></div>
            <label className="text-sm"><span className="field-label">Availability</span>
              <select name="availability" defaultValue={p.availability} className="field"><option value="AVAILABLE">Available</option><option value="ON_REQUEST">On request</option><option value="OUT_OF_SEASON">Out of season</option><option value="UNAVAILABLE">Unavailable</option></select></label>
            <div className="text-sm"><span className="field-label">Stock (kg)</span>
              <div className="flex items-center gap-2"><label className="flex items-center gap-1 whitespace-nowrap text-xs"><input type="checkbox" name="tracked" defaultChecked={p.stockKg !== null} />Track</label>
                <input name="stockKg" type="number" min="0" step="any" defaultValue={p.stockKg?.toString() ?? ""} aria-label="Stock in kg" className="field" /></div></div>
            {canPrice ? (
              <div className="text-sm"><span className="field-label">Price / kg ({p.currency})</span>
                <input name="pricePerKg" type="number" min="0" step="0.01" defaultValue={p.pricePerKg?.toString() ?? ""} aria-label="Price per kg" className="field" />
                <label className="mt-1 flex items-center gap-1 text-xs"><input type="checkbox" name="priceVisible" defaultChecked={p.priceVisible} />Show on website</label></div>
            ) : <div className="text-sm text-muted">Pricing: managers only</div>}
            <div className="flex flex-col gap-1">
              <input name="reason" placeholder="Reason (optional)" aria-label="Reason for change" className="field min-h-9 py-1 text-sm" />
              <button type="submit" className="btn btn-primary min-h-9 py-1.5">Save</button>
            </div>
          </form>
        ))}
      </div>
      <Panel title="Recent stock movements" className="mt-8">
        {movements.length === 0 ? <Empty>No stock movements yet.</Empty> : (
          <div className="overflow-x-auto"><table className="admin-table">
            <thead><tr><th>When</th><th>Product</th><th>Change</th><th>Reason</th></tr></thead>
            <tbody>{movements.map((m) => (
              <tr key={m.id}><td className="whitespace-nowrap">{fmtDateTime(m.createdAt)}</td><td>{m.product.name}</td>
                <td className={Number(m.changeKg) < 0 ? "text-burgundy" : "text-[#1d5c2d]"}>{Number(m.changeKg) > 0 ? "+" : ""}{Number(m.changeKg).toLocaleString("en")} kg</td><td>{m.reason}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </Panel>
    </>
  );
}
