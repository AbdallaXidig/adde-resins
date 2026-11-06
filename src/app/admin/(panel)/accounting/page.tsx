import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { accountBalances } from "@/lib/finance";
import { inPeriod, resolvePeriod } from "@/lib/periods";
import { BarList } from "@/components/admin/BarList";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { PeriodPicker } from "@/components/admin/PeriodPicker";
import { Empty, PageHeader, Panel, fmtDate, fmtMoney } from "@/components/admin/ui";
import { Stat } from "@/components/admin/finance-ui";

export const metadata = { title: "Accounting" };

const sum = (rows: { _sum: { [k: string]: unknown } }, key: string) => Number((rows._sum as Record<string, unknown>)[key] ?? 0);
const DAY = 86400_000;

export default async function Accounting({ searchParams }: { searchParams: FlashParams }) {
  await requirePermission("accounting");
  const sp = await searchParams;
  const period = resolvePeriod(String(sp.period ?? ""), String(sp.from ?? ""), String(sp.to ?? ""));
  const range = inPeriod(period);

  const [invoiced, received, purchased, paidSuppliers, otherOut, otherIn, expenses, byCategory, openInvoices, openPurchases, balances] = await Promise.all([
    prisma.salesDocument.aggregate({ where: { kind: "INVOICE", status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] }, issueDate: range }, _sum: { total: true }, _count: true }),
    prisma.payment.aggregate({ where: { direction: "IN", documentId: { not: null }, date: range }, _sum: { amount: true } }),
    prisma.purchase.aggregate({ where: { status: { in: ["ORDERED", "RECEIVED"] }, orderDate: range }, _sum: { total: true }, _count: true }),
    prisma.payment.aggregate({ where: { direction: "OUT", purchaseId: { not: null }, date: range }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { direction: "OUT", purchaseId: null, date: range }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { direction: "IN", documentId: null, date: range }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { date: range }, _sum: { amount: true }, _count: true }),
    prisma.expense.groupBy({ by: ["category"], where: { date: range }, _sum: { amount: true } }),
    prisma.salesDocument.findMany({ where: { kind: "INVOICE", status: { in: ["ISSUED", "PARTIALLY_PAID"] } }, orderBy: { dueDate: "asc" }, include: { customer: { select: { id: true, name: true, company: true } } } }),
    prisma.purchase.findMany({ where: { status: { in: ["ORDERED", "RECEIVED"] } }, orderBy: { orderDate: "asc" }, include: { supplier: { select: { id: true, name: true } } } }),
    accountBalances(),
  ]);

  const sales = sum(invoiced, "total"), purchases = sum(purchased, "total"), spent = sum(expenses, "amount");
  const cashIn = sum(received, "amount") + sum(otherIn, "amount");
  const cashOut = sum(paidSuppliers, "amount") + sum(otherOut, "amount") + spent;
  const profit = sales - purchases - spent;

  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  const receivables = openInvoices.map((d) => ({ ...d, balance: Number(d.total) - Number(d.amountPaid), late: d.dueDate ? Math.floor((+today - +d.dueDate) / DAY) : 0 })).filter((d) => d.balance > 0.004);
  const bucket = (from: number, to: number) => receivables.filter((d) => d.late >= from && d.late <= to).reduce((s, d) => s + d.balance, 0);
  const aging = [["Not yet due", bucket(-100000, 0)], ["1–30 days late", bucket(1, 30)], ["31–60 days late", bucket(31, 60)], ["Over 60 days late", bucket(61, 100000)]] as const;
  const payables = openPurchases.map((p) => ({ ...p, balance: Number(p.total) - Number(p.amountPaid) })).filter((p) => p.balance > 0.004);
  const totalCash = balances.list.filter((a) => a.active).reduce((s, a) => s + a.balance, 0);
  const qs = new URLSearchParams({ period: period.key, ...(period.key === "custom" ? { from: String(sp.from ?? ""), to: String(sp.to ?? "") } : {}) }).toString();

  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title="Accounting" text={`${period.label}. Totals in USD.`} action={<PeriodPicker value={period.key} from={typeof sp.from === "string" ? sp.from : undefined} to={typeof sp.to === "string" ? sp.to : undefined} />} />
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Accounting sections">
        <Link href="/admin/accounting/payments" className="btn btn-outline text-sm">Payments</Link>
        <Link href="/admin/accounting/expenses" className="btn btn-outline text-sm">Expenses</Link>
        <Link href="/admin/accounting/accounts" className="btn btn-outline text-sm">Cash, bank & mobile accounts</Link>
        <a href={`/admin/accounting-export?type=invoices&${qs}`} className="btn btn-outline text-sm">Export invoices (CSV)</a>
        <a href={`/admin/accounting-export?type=payments&${qs}`} className="btn btn-outline text-sm">Export payments (CSV)</a>
        <a href={`/admin/accounting-export?type=expenses&${qs}`} className="btn btn-outline text-sm">Export expenses (CSV)</a>
        <a href={`/admin/accounting-export?type=purchases&${qs}`} className="btn btn-outline text-sm">Export purchases (CSV)</a>
      </nav>

      <h2 className="mb-3 text-xl font-semibold">Profit and loss</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={`Sales invoiced (${invoiced._count} ${invoiced._count === 1 ? "invoice" : "invoices"})`} value={fmtMoney(sales)} href="/admin/sales?kind=INVOICE" />
        <Stat label={`Purchases (${purchased._count})`} value={fmtMoney(purchases)} href="/admin/purchases" />
        <Stat label={`Expenses (${expenses._count})`} value={fmtMoney(spent)} href="/admin/accounting/expenses" />
        <Stat label="Profit estimate" value={fmtMoney(profit)} tone={profit < 0 ? "bad" : "ok"} />
      </div>
      <h2 className="mb-3 mt-8 text-xl font-semibold">Cash flow</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Money received" value={fmtMoney(cashIn)} tone="ok" href="/admin/accounting/payments?direction=IN" />
        <Stat label="Money paid out (incl. expenses)" value={fmtMoney(cashOut)} href="/admin/accounting/payments?direction=OUT" />
        <Stat label="Net cash flow" value={fmtMoney(cashIn - cashOut)} tone={cashIn - cashOut < 0 ? "bad" : "ok"} />
        <Stat label="Cash in all accounts now" value={fmtMoney(totalCash)} href="/admin/accounting/accounts" />
      </div>
      <p className="mt-3 text-xs text-muted">Profit estimate = sales invoiced − purchases − expenses in the period. It is a management figure, not audited accounts: stock bought in one period and sold in another will move profit between periods. Ask your accountant for formal statements.</p>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Panel title="Money owed to you" className="scroll-mt-20" action={<span className="font-semibold text-burgundy">{fmtMoney(receivables.reduce((s, d) => s + d.balance, 0))}</span>}>
          <div id="receivables" className="mb-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {aging.map(([label, v]) => <div key={label} className="rounded-lg bg-cream p-3"><p className="font-semibold">{fmtMoney(v)}</p><p className="text-xs text-muted">{label}</p></div>)}
          </div>
          {receivables.length === 0 ? <Empty>No unpaid invoices.</Empty> : (
            <div className="overflow-x-auto"><table className="admin-table">
              <thead><tr><th>Invoice</th><th>Customer</th><th>Due</th><th className="text-end">Balance</th></tr></thead>
              <tbody>{receivables.slice(0, 25).map((d) => (
                <tr key={d.id}><td><Link href={`/admin/sales/${d.id}`} className="font-mono text-sm underline">{d.number}</Link></td><td><Link href={`/admin/customers/${d.customer.id}`} className="hover:underline">{d.customer.company ?? d.customer.name}</Link></td>
                  <td className={`whitespace-nowrap ${d.late > 0 ? "font-semibold text-burgundy" : ""}`}>{fmtDate(d.dueDate)}{d.late > 0 && ` (${d.late}d late)`}</td><td className="text-end font-semibold">{fmtMoney(d.balance)}</td></tr>
              ))}</tbody>
            </table></div>
          )}
        </Panel>
        <Panel title="Money you owe suppliers" action={<span className="font-semibold text-burgundy">{fmtMoney(payables.reduce((s, p) => s + p.balance, 0))}</span>}>
          <div id="payables" />
          {payables.length === 0 ? <Empty>Nothing owed to suppliers.</Empty> : (
            <div className="overflow-x-auto"><table className="admin-table">
              <thead><tr><th>Purchase</th><th>Supplier</th><th>Ordered</th><th className="text-end">Owed</th></tr></thead>
              <tbody>{payables.slice(0, 25).map((p) => (
                <tr key={p.id}><td><Link href={`/admin/purchases/${p.id}`} className="font-mono text-sm underline">{p.number}</Link></td><td><Link href={`/admin/suppliers/${p.supplier.id}`} className="hover:underline">{p.supplier.name}</Link></td><td className="whitespace-nowrap">{fmtDate(p.orderDate)}</td><td className="text-end font-semibold">{fmtMoney(p.balance)}</td></tr>
              ))}</tbody>
            </table></div>
          )}
        </Panel>
        <Panel title="Account balances">
          {balances.list.length === 0 ? <Empty>No accounts yet. <Link href="/admin/accounting/accounts" className="underline">Add your cash box, bank and mobile money accounts</Link> so balances can be tracked.</Empty> : (
            <div className="overflow-x-auto"><table className="admin-table">
              <thead><tr><th>Account</th><th className="text-end">In</th><th className="text-end">Out</th><th className="text-end">Balance</th></tr></thead>
              <tbody>{balances.list.map((a) => <tr key={a.id} className={a.active ? "" : "opacity-60"}><td>{a.name}</td><td className="text-end">{fmtMoney(a.moneyIn)}</td><td className="text-end">{fmtMoney(a.moneyOut)}</td><td className={`text-end font-semibold ${a.balance < 0 ? "text-burgundy" : ""}`}>{fmtMoney(a.balance)}</td></tr>)}</tbody>
            </table></div>
          )}
          {(balances.unassigned.moneyIn > 0 || balances.unassigned.moneyOut > 0) && <p className="mt-3 text-xs text-muted">Not linked to an account: {fmtMoney(balances.unassigned.moneyIn)} in, {fmtMoney(balances.unassigned.moneyOut)} out.</p>}
        </Panel>
        <BarList title="Expenses by category (USD)" rows={byCategory.map((c) => ({ label: c.category, value: Number(c._sum.amount ?? 0) })).sort((a, b) => b.value - a.value)} empty="No expenses in this period." />
      </div>
    </>
  );
}
