import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { setOrderStatus } from "../../../actions/workflow";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { ContactLinks, StatusForm, Timeline } from "@/components/admin/StatusForm";
import { PageHeader, Panel, StatusBadge, fmtDate, fmtMoney, fmtQty } from "@/components/admin/ui";

export const metadata = { title: "Order" };

export default async function OrderDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: FlashParams }) {
  await requirePermission("orders");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const order = await prisma.order.findUnique({ where: { id }, include: { customer: true, items: true, statusEvents: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } } } });
  if (!order) notFound();
  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title={order.reference} text={order.type === "ORDER" ? "Order" : "Cart sent as a quotation request"} action={<div className="flex items-center gap-3"><StatusBadge status={order.status} /><Link href="/admin/orders" className="btn btn-outline">Back</Link></div>} />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Panel title="Items">
            <div className="overflow-x-auto"><table className="admin-table">
              <thead><tr><th>Product</th><th>Grade</th><th>Quantity</th><th>Price / kg</th><th>Line total</th></tr></thead>
              <tbody>{order.items.map((i) => (
                <tr key={i.id}><td>{i.productId ? <Link href={`/admin/products/${i.productId}`} className="underline">{i.productName}</Link> : i.productName}</td><td>{i.grade ?? "—"}</td>
                  <td className="whitespace-nowrap">{fmtQty(i.quantity.toString(), i.unit)}</td><td>{i.unitPricePerKg ? fmtMoney(Number(i.unitPricePerKg), order.currency) : "To quote"}</td><td>{i.lineTotal ? fmtMoney(Number(i.lineTotal), order.currency) : "To quote"}</td></tr>
              ))}</tbody>
            </table></div>
            <p className="mt-3 text-end font-semibold">Subtotal of priced items: {fmtMoney(order.subtotal ? Number(order.subtotal) : null, order.currency)}</p>
            {order.hasUnpricedItems && <p className="text-end text-sm text-muted">Some items still need a price in the quotation.</p>}
            <p className="mt-2 text-end text-xs text-muted">Payment: {order.paymentStatus.replaceAll("_", " ").toLowerCase()} (no online payment provider is connected)</p>
          </Panel>
          <Panel title="Customer and shipping">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><p className="font-semibold"><Link href={`/admin/customers/${order.customer.id}`} className="underline">{order.customer.name}</Link></p><p className="text-sm">{order.customer.company}</p><p className="text-sm">{order.customer.email}{order.customer.phone && ` · ${order.customer.phone}`}</p></div>
              <div className="text-sm"><p><span className="text-muted">Destination:</span> {[order.shippingPort, order.shippingCountry].filter(Boolean).join(", ")}</p>{order.shippingAddress && <p className="whitespace-pre-line">{order.shippingAddress}</p>}<p className="text-muted">Placed {fmtDate(order.createdAt)}</p></div>
            </div>
            {order.notes && <p className="mt-3 whitespace-pre-line border-t border-line pt-3 text-sm">{order.notes}</p>}
            <div className="mt-3"><ContactLinks email={order.customer.email} phone={order.customer.phone} reference={order.reference} /></div>
          </Panel>
          <Panel title="Timeline"><Timeline events={order.statusEvents} /></Panel>
        </div>
        <Panel title="Update status"><StatusForm id={order.id} status={order.status} adminNotes={order.adminNotes} action={setOrderStatus} hint={order.stockCommitted ? "Stock is currently committed for this order." : "Confirming deducts tracked stock; cancelling returns it."} /></Panel>
      </div>
    </>
  );
}
