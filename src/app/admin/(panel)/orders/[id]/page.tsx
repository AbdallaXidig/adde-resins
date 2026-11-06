import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { resendOrderToSheet, setOrderStatus } from "../../../actions/workflow";
import { salesDocFromOrderAction } from "../../../actions/finance";
import { can } from "@/lib/permissions";
import { SheetStatus } from "@/components/admin/SheetStatus";
import { localePath } from "@/lib/seo";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { ContactLinks, StatusForm, Timeline } from "@/components/admin/StatusForm";
import { PageHeader, Panel, StatusBadge, fmtDate, fmtMoney, fmtQty } from "@/components/admin/ui";

export const metadata = { title: "Order" };

export default async function OrderDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: FlashParams }) {
  const user = await requirePermission("orders");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const order = await prisma.order.findUnique({ where: { id }, include: { customer: true, items: true, salesDocuments: { select: { id: true, number: true, kind: true, status: true } }, statusEvents: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } } } });
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
        <div className="space-y-6">
          <Panel title="Update status"><StatusForm id={order.id} status={order.status} adminNotes={order.adminNotes} action={setOrderStatus} hint={order.stockCommitted ? "Stock is currently committed for this order." : "Confirming deducts tracked stock; cancelling returns it."} /></Panel>
          {order.accessToken && (
            <Panel title={order.type === "ORDER" ? "Pro-forma invoice" : "Quotation document"}>
              <p className="text-sm text-muted">The document the customer received, with today&apos;s order details. Print it or save it as PDF.</p>
              <a href={`${localePath(order.locale, `/quotation/${order.reference}`)}?k=${order.accessToken}`} target="_blank" rel="noopener" className="btn btn-outline mt-3 text-sm">Open document</a>
            </Panel>
          )}
          {can(user.role, "sales") && (
            <Panel title="Quotation or invoice">
              {order.salesDocuments.length > 0 && <ul className="mb-3 space-y-1 text-sm">{order.salesDocuments.map((d) => <li key={d.id}><Link href={`/admin/sales/${d.id}`} className="font-mono underline">{d.number}</Link> <span className="text-muted">({d.kind === "QUOTATION" ? "quotation" : "invoice"}, {d.status.toLowerCase().replace("_", " ")})</span></li>)}</ul>}
              <p className="mb-3 text-sm text-muted">Start a formal quotation or invoice from this request, then set the final prices.</p>
              <div className="flex flex-wrap gap-2">
                {(["QUOTATION", "INVOICE"] as const).map((k) => (
                  <form key={k} action={salesDocFromOrderAction}><input type="hidden" name="orderId" value={order.id} /><input type="hidden" name="kind" value={k} /><input type="hidden" name="_back" value={`/admin/orders/${order.id}`} />
                    <button className={`btn text-sm ${k === "INVOICE" ? "btn-primary" : "btn-outline"}`}>{k === "INVOICE" ? "Create invoice" : "Create quotation"}</button></form>
                ))}
              </div>
            </Panel>
          )}
          <Panel title="Online sheet"><SheetStatus id={order.id} syncedAt={order.sheetSyncedAt} error={order.sheetError} action={resendOrderToSheet} /></Panel>
        </div>
      </div>
    </>
  );
}
