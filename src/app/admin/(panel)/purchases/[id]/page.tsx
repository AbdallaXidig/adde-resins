import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { METHOD_LABELS } from "@/lib/finance";
import { changePurchaseStatus, deletePaymentAction, deletePurchaseDraft } from "../../../actions/finance";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { PaymentForm } from "@/components/admin/PaymentForm";
import { Empty, PageHeader, Panel, fmtDate, fmtMoney, fmtQty } from "@/components/admin/ui";
import { PaidBadge, PurchaseBadge } from "@/components/admin/finance-ui";

export const metadata = { title: "Purchase" };

function StatusButton({ id, to, label, tone = "btn-outline" }: { id: string; to: string; label: string; tone?: string }) {
  return (
    <form action={changePurchaseStatus}>
      <input type="hidden" name="id" value={id} /><input type="hidden" name="to" value={to} /><input type="hidden" name="_back" value={`/admin/purchases/${id}`} />
      <button type="submit" className={`btn ${tone} text-sm`}>{label}</button>
    </form>
  );
}

export default async function PurchaseDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: FlashParams }) {
  const user = await requirePermission("purchases");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const p = await prisma.purchase.findUnique({ where: { id }, include: { supplier: true, items: { orderBy: { sortOrder: "asc" } }, payments: { orderBy: { date: "desc" }, include: { account: true } } } });
  if (!p) notFound();
  const total = Number(p.total), paid = Number(p.amountPaid), owed = total - paid;
  const canPay = can(user.role, "accounting");
  const back = `/admin/purchases/${id}`;
  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title={p.number} text={`Purchase from ${p.supplier.name}`} action={<div className="flex items-center gap-3"><PurchaseBadge status={p.status} /><Link href="/admin/purchases" className="btn btn-outline">Back</Link></div>} />
      <div className="mb-6 flex flex-wrap gap-2">
        {(p.status === "DRAFT" || p.status === "ORDERED") && <Link href={`${back}/edit`} className="btn btn-outline text-sm">Edit</Link>}
        {p.status === "DRAFT" && <StatusButton id={id} to="ORDERED" label="Mark as ordered" tone="btn-primary" />}
        {(p.status === "DRAFT" || p.status === "ORDERED") && <StatusButton id={id} to="RECEIVED" label="Goods received (add to stock)" tone={p.status === "ORDERED" ? "btn-primary" : "btn-outline"} />}
        {p.status === "DRAFT" && p.payments.length === 0 && <form action={deletePurchaseDraft}><input type="hidden" name="id" value={id} /><input type="hidden" name="_back" value={back} /><button className="btn btn-outline text-sm text-burgundy">Delete draft</button></form>}
        {p.status !== "DRAFT" && p.status !== "CANCELLED" && p.payments.length === 0 && <StatusButton id={id} to="CANCELLED" label={p.stockReceived ? "Cancel (removes the stock again)" : "Cancel purchase"} tone="btn-outline text-burgundy" />}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Panel title="Items">
            <div className="overflow-x-auto"><table className="admin-table min-w-[600px]">
              <thead><tr><th>Description</th><th>Grade</th><th className="text-end">Quantity</th><th className="text-end">Cost / kg</th><th className="text-end">Amount</th></tr></thead>
              <tbody>{p.items.map((i) => (
                <tr key={i.id}><td>{i.productId ? <Link href={`/admin/products/${i.productId}`} className="underline">{i.description}</Link> : i.description}</td><td>{i.grade ?? "—"}</td>
                  <td className="whitespace-nowrap text-end">{fmtQty(i.quantity.toString(), i.unit)}</td><td className="text-end">{fmtMoney(Number(i.unitCost))}</td><td className="whitespace-nowrap text-end font-semibold">{fmtMoney(Number(i.lineTotal))}</td></tr>
              ))}</tbody>
            </table></div>
            <dl className="ms-auto mt-4 max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Goods</dt><dd>{fmtMoney(Number(p.subtotal))}</dd></div>
              {Number(p.shipping) > 0 && <div className="flex justify-between"><dt className="text-muted">Shipping / transport</dt><dd>{fmtMoney(Number(p.shipping))}</dd></div>}
              {Number(p.otherCosts) > 0 && <div className="flex justify-between"><dt className="text-muted">Other costs</dt><dd>{fmtMoney(Number(p.otherCosts))}</dd></div>}
              <div className="flex justify-between border-t border-line pt-1.5 text-base font-bold text-brown"><dt>Total</dt><dd>{fmtMoney(total)}</dd></div>
              {p.status !== "DRAFT" && <><div className="flex justify-between"><dt className="text-muted">Paid</dt><dd>{fmtMoney(paid)}</dd></div>
                <div className="flex justify-between font-semibold"><dt>Still owed</dt><dd className={owed > 0 ? "text-burgundy" : "text-[#1d5c2d]"}>{fmtMoney(owed)}</dd></div></>}
            </dl>
          </Panel>
          <Panel title="Payments to supplier" action={p.status !== "DRAFT" && p.status !== "CANCELLED" ? <PaidBadge total={total} paid={paid} /> : undefined}>
            {p.payments.length === 0 ? <Empty>No payments yet.</Empty> : (
              <div className="overflow-x-auto"><table className="admin-table">
                <thead><tr><th>Number</th><th>Date</th><th>Method</th><th>Account</th><th>Reference</th><th className="text-end">Amount</th><th /></tr></thead>
                <tbody>{p.payments.map((x) => (
                  <tr key={x.id}><td className="font-mono text-xs">{x.number}</td><td className="whitespace-nowrap">{fmtDate(x.date)}</td><td>{METHOD_LABELS[x.method]}</td><td>{x.account?.name ?? "—"}</td><td>{x.reference ?? "—"}</td><td className="text-end font-semibold">{fmtMoney(Number(x.amount))}</td>
                    <td>{canPay && <form action={deletePaymentAction}><input type="hidden" name="id" value={x.id} /><input type="hidden" name="_back" value={back} /><button className="text-xs text-burgundy underline">Delete</button></form>}</td></tr>
                ))}</tbody>
              </table></div>
            )}
            {canPay && (p.status === "ORDERED" || p.status === "RECEIVED") && owed > 0 && (
              <div className="mt-5 border-t border-line pt-5"><h3 className="mb-3 font-semibold">Record a payment to {p.supplier.name}</h3><PaymentForm back={back} purchaseId={p.id} direction="OUT" suggested={owed} /></div>
            )}
            {p.status === "DRAFT" && <p className="mt-3 text-sm text-muted">Mark the purchase as ordered to record payments.</p>}
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Supplier">
            <p className="font-semibold"><Link href={`/admin/suppliers/${p.supplier.id}`} className="underline">{p.supplier.name}</Link></p>
            <p className="text-sm">{[p.supplier.contact, p.supplier.phone, p.supplier.email, p.supplier.country].filter(Boolean).join(" · ")}</p>
          </Panel>
          <Panel title="Details">
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted">Order date</dt><dd>{fmtDate(p.orderDate)}</dd>
              <dt className="text-muted">Expected</dt><dd>{fmtDate(p.expectedDate)}</dd>
              <dt className="text-muted">Received</dt><dd>{fmtDate(p.receivedDate)}</dd>
              <dt className="text-muted">Supplier ref</dt><dd>{p.supplierRef ?? "—"}</dd>
              <dt className="text-muted">Created by</dt><dd>{p.createdByName ?? "—"}</dd>
              <dt className="text-muted">Stock</dt><dd>{p.stockReceived ? "Added to stock" : "Added when received"}</dd>
            </dl>
            {p.notes && <p className="mt-4 whitespace-pre-line border-t border-line pt-3 text-sm">{p.notes}</p>}
          </Panel>
        </div>
      </div>
    </>
  );
}
