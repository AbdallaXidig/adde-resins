import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { STATUS_LABELS } from "@/lib/status";
import { BarList } from "@/components/admin/BarList";
import { PageHeader, fmtMoney } from "@/components/admin/ui";

export const metadata = { title: "Reports" };
const RANGES = { "30": 30, "90": 90, "365": 365 } as const;
const kg = (q: unknown, u: string) => Number(q) * (u === "MT" ? 1000 : 1);

export default async function Reports({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requirePermission("reports");
  const { range } = await searchParams;
  const days = RANGES[(range ?? "90") as keyof typeof RANGES] ?? 90;
  const since = new Date(Date.now() - days * 86400_000);
  const [rfqs, orders] = await Promise.all([
    prisma.rfq.findMany({ where: { createdAt: { gte: since } }, select: { productName: true, quantity: true, unit: true, destinationCountry: true, status: true, createdAt: true } }),
    prisma.order.findMany({ where: { createdAt: { gte: since } }, include: { items: true } }),
  ]);

  const confirmedStatuses = ["CONFIRMED", "PROCESSING", "READY_FOR_SHIPMENT", "SHIPPED", "DELIVERED"];
  const confirmed = orders.filter((o) => confirmedStatuses.includes(o.status));
  const confirmedValue = confirmed.reduce((s, o) => s + Number(o.subtotal ?? 0), 0);
  const sum = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);
  const top = (m: Map<string, number>, n = 8) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, value]) => ({ label, value }));

  const volume = new Map<string, number>(), dest = new Map<string, number>(), status = new Map<string, number>(), monthly = new Map<string, number>();
  for (const r of rfqs) { sum(volume, r.productName, kg(r.quantity, r.unit) / 1000); sum(dest, r.destinationCountry, 1); sum(status, STATUS_LABELS[r.status], 1); }
  for (const o of orders) { for (const i of o.items) sum(volume, i.productName, kg(i.quantity, i.unit) / 1000); sum(dest, o.shippingCountry, 1); sum(status, STATUS_LABELS[o.status], 1); }
  for (const d of [...rfqs.map((r) => r.createdAt), ...orders.map((o) => o.createdAt)]) sum(monthly, d.toISOString().slice(0, 7), 1);
  const months = [...monthly.entries()].sort().map(([label, value]) => ({ label: new Date(`${label}-01`).toLocaleString("en", { month: "short", year: "numeric" }), value }));

  const tiles = [
    ["Quotation requests", rfqs.length], ["Orders and cart quotes", orders.length], ["Confirmed or later", confirmed.length],
    ["Confirmed value (priced items)", fmtMoney(confirmedValue)],
  ];
  return (
    <>
      <PageHeader title="Sales and export reports" text={`Website activity in the last ${days} days.`} action={
        <form method="get" className="flex gap-2"><select name="range" defaultValue={String(days)} className="field w-auto" aria-label="Period"><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last 12 months</option></select><button className="btn btn-outline">Show</button></form>
      } />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map(([label, v]) => <div key={label} className="card p-5"><p className="font-serif text-3xl font-semibold text-brown">{v}</p><p className="mt-1 text-sm text-muted">{label}</p></div>)}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <BarList title="Requested volume by product (metric tons)" rows={top(volume)} unit=" MT" />
        <BarList title="Requests by destination country" rows={top(dest)} />
        <BarList title="Requests and orders by status" rows={top(status, 9)} />
        <BarList title="Requests and orders per month" rows={months} />
      </div>
      <p className="mt-6 text-xs text-muted">Volumes combine quotation requests and cart orders. Values include only items with a recorded price.</p>
    </>
  );
}
