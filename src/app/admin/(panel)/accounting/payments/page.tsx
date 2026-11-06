import Link from "next/link";
import type { PaymentDirection, PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { METHOD_LABELS, PAYMENT_METHODS } from "@/lib/finance";
import { inPeriod, resolvePeriod } from "@/lib/periods";
import { deletePaymentAction } from "../../../actions/finance";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { PaymentForm } from "@/components/admin/PaymentForm";
import { PeriodPicker } from "@/components/admin/PeriodPicker";
import { Empty, PageHeader, Pager, Panel, fmtDate, fmtMoney, pageNum } from "@/components/admin/ui";
import { Stat } from "@/components/admin/finance-ui";

export const metadata = { title: "Payments" };
const PER = 50;

export default async function Payments({ searchParams }: { searchParams: FlashParams }) {
  await requirePermission("accounting");
  const sp = await searchParams;
  const period = resolvePeriod(String(sp.period ?? "this-year"), String(sp.from ?? ""), String(sp.to ?? ""));
  const direction = (sp.direction === "IN" || sp.direction === "OUT" ? sp.direction : undefined) as PaymentDirection | undefined;
  const method = (PAYMENT_METHODS.includes(sp.method as PaymentMethod) ? sp.method : undefined) as PaymentMethod | undefined;
  const page = pageNum(sp.page);
  const where: Prisma.PaymentWhereInput = { date: inPeriod(period), ...(direction ? { direction } : {}), ...(method ? { method } : {}) };
  const [rows, total, ins, outs] = await Promise.all([
    prisma.payment.findMany({ where, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: PER, skip: (page - 1) * PER, include: { account: true, document: { select: { id: true, number: true } }, purchase: { select: { id: true, number: true } }, customer: { select: { id: true, name: true } }, supplier: { select: { id: true, name: true } } } }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({ where: { ...where, direction: "IN" }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { ...where, direction: "OUT" }, _sum: { amount: true } }),
  ]);
  const back = "/admin/accounting/payments";
  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title="Payments" text={`${period.label}. Customer payments are recorded on each invoice, supplier payments on each purchase.`} action={<Link href="/admin/accounting" className="btn btn-outline">Accounting</Link>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Money in" value={fmtMoney(Number(ins._sum.amount ?? 0))} tone="ok" /><Stat label="Money out (excl. expenses)" value={fmtMoney(Number(outs._sum.amount ?? 0))} /><Stat label="Payments" value={String(total)} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div>
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <PeriodPicker value={period.key} from={typeof sp.from === "string" ? sp.from : undefined} to={typeof sp.to === "string" ? sp.to : undefined} />
            <form method="get" className="flex flex-wrap gap-2">
              <input type="hidden" name="period" value={period.key} />
              <select name="direction" defaultValue={direction ?? ""} className="field w-auto" aria-label="Direction"><option value="">In and out</option><option value="IN">Money in</option><option value="OUT">Money out</option></select>
              <select name="method" defaultValue={method ?? ""} className="field w-auto" aria-label="Method"><option value="">Any method</option>{PAYMENT_METHODS.map((m) => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}</select>
              <button className="btn btn-outline">Filter</button>
            </form>
          </div>
          {rows.length === 0 ? <Empty>No payments in this period.</Empty> : (
            <div className="card overflow-x-auto"><table className="admin-table min-w-[820px]">
              <thead><tr><th>Number</th><th>Date</th><th>For</th><th>Method</th><th>Account</th><th className="text-end">In</th><th className="text-end">Out</th><th /></tr></thead>
              <tbody>{rows.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs">{p.number}{p.reference && <span className="block text-muted">{p.reference}</span>}</td>
                  <td className="whitespace-nowrap">{fmtDate(p.date)}</td>
                  <td>{p.document ? <Link href={`/admin/sales/${p.document.id}`} className="underline">{p.document.number}</Link> : p.purchase ? <Link href={`/admin/purchases/${p.purchase.id}`} className="underline">{p.purchase.number}</Link> : <span className="text-muted">{p.direction === "IN" ? "Other income" : "Other payment"}</span>}
                    <span className="block text-xs text-muted">{p.customer?.name ?? p.supplier?.name ?? p.notes ?? ""}</span></td>
                  <td>{METHOD_LABELS[p.method]}</td><td>{p.account?.name ?? "—"}</td>
                  <td className="text-end font-semibold text-[#1d5c2d]">{p.direction === "IN" ? fmtMoney(Number(p.amount)) : ""}</td>
                  <td className="text-end font-semibold">{p.direction === "OUT" ? fmtMoney(Number(p.amount)) : ""}</td>
                  <td><form action={deletePaymentAction}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="_back" value={back} /><button className="text-xs text-burgundy underline">Delete</button></form></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
          <Pager page={page} total={total} perPage={PER} params={{ period: period.key, direction, method }} />
        </div>
        <Panel title="Other money in or out">
          <p className="mb-4 text-sm text-muted">For money not tied to an invoice or purchase, such as a loan, a capital injection or a refund. Day-to-day costs go under <Link href="/admin/accounting/expenses" className="underline">Expenses</Link>.</p>
          <PaymentForm back={back} freeStanding />
        </Panel>
      </div>
    </>
  );
}
