import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { EXPENSE_CATEGORIES, METHOD_LABELS, PAYMENT_METHODS } from "@/lib/finance";
import { inPeriod, resolvePeriod } from "@/lib/periods";
import { createExpenseAction, deleteExpenseAction } from "../../../actions/finance";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { PeriodPicker } from "@/components/admin/PeriodPicker";
import { Empty, PageHeader, Pager, Panel, fmtDate, fmtMoney, pageNum } from "@/components/admin/ui";
import { Stat, accountOptions, todayInput } from "@/components/admin/finance-ui";

export const metadata = { title: "Expenses" };
const PER = 50;

export default async function Expenses({ searchParams }: { searchParams: FlashParams }) {
  await requirePermission("accounting");
  const sp = await searchParams;
  const period = resolvePeriod(String(sp.period ?? "this-month"), String(sp.from ?? ""), String(sp.to ?? ""));
  const category = typeof sp.category === "string" && sp.category ? sp.category : undefined;
  const page = pageNum(sp.page);
  const where: Prisma.ExpenseWhereInput = { date: inPeriod(period), ...(category ? { category } : {}) };
  const [rows, total, agg, accounts, used] = await Promise.all([
    prisma.expense.findMany({ where, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: PER, skip: (page - 1) * PER, include: { account: true } }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
    accountOptions(),
    prisma.expense.findMany({ distinct: ["category"], select: { category: true } }),
  ]);
  const categories = [...new Set([...EXPENSE_CATEGORIES, ...used.map((u) => u.category)])];
  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title="Expenses" text={period.label} action={<Link href="/admin/accounting" className="btn btn-outline">Accounting</Link>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2"><Stat label={`Total expenses (${total})`} value={fmtMoney(Number(agg._sum.amount ?? 0))} /></div>
      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div>
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <PeriodPicker value={period.key} from={typeof sp.from === "string" ? sp.from : undefined} to={typeof sp.to === "string" ? sp.to : undefined} />
            <form method="get" className="flex gap-2"><input type="hidden" name="period" value={period.key} />
              <select name="category" defaultValue={category ?? ""} className="field w-auto" aria-label="Category"><option value="">All categories</option>{categories.map((c) => <option key={c}>{c}</option>)}</select>
              <button className="btn btn-outline">Filter</button></form>
          </div>
          {rows.length === 0 ? <Empty>No expenses in this period.</Empty> : (
            <div className="card overflow-x-auto"><table className="admin-table min-w-[720px]">
              <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Paid with</th><th className="text-end">Amount</th><th /></tr></thead>
              <tbody>{rows.map((e) => (
                <tr key={e.id}><td className="whitespace-nowrap">{fmtDate(e.date)}<span className="block font-mono text-xs text-muted">{e.number}</span></td><td>{e.category}</td>
                  <td>{e.description}{e.payee && <span className="block text-xs text-muted">To {e.payee}</span>}</td><td>{METHOD_LABELS[e.method]}{e.account && <span className="block text-xs text-muted">{e.account.name}</span>}</td>
                  <td className="text-end font-semibold">{fmtMoney(Number(e.amount))}</td>
                  <td><form action={deleteExpenseAction}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="_back" value="/admin/accounting/expenses" /><button className="text-xs text-burgundy underline">Delete</button></form></td></tr>
              ))}</tbody>
            </table></div>
          )}
          <Pager page={page} total={total} perPage={PER} params={{ period: period.key, category }} />
        </div>
        <Panel title="Record an expense">
          <form action={createExpenseAction} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="_back" value="/admin/accounting/expenses" />
            <div><label className="field-label" htmlFor="e-date">Date</label><input id="e-date" name="date" type="date" required defaultValue={todayInput()} className="field" /></div>
            <div><label className="field-label" htmlFor="e-amount">Amount (USD)</label><input id="e-amount" name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" required className="field" /></div>
            <div className="sm:col-span-2"><label className="field-label" htmlFor="e-category">Category</label><input id="e-category" name="category" list="expense-categories" required maxLength={80} className="field" placeholder="Choose or type a category" /><datalist id="expense-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist></div>
            <div className="sm:col-span-2"><label className="field-label" htmlFor="e-desc">Description</label><input id="e-desc" name="description" required maxLength={300} className="field" placeholder="e.g. Truck from Qardho to Bosaso" /></div>
            <div><label className="field-label" htmlFor="e-method">Paid with</label><select id="e-method" name="method" defaultValue="CASH" className="field">{PAYMENT_METHODS.map((m) => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}</select></div>
            <div><label className="field-label" htmlFor="e-account">Account</label><select id="e-account" name="accountId" className="field"><option value="">Not specified</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            <div><label className="field-label" htmlFor="e-payee">Paid to</label><input id="e-payee" name="payee" maxLength={160} className="field" /></div>
            <div><label className="field-label" htmlFor="e-ref">Receipt / transaction ID</label><input id="e-ref" name="reference" maxLength={120} className="field" /></div>
            <button type="submit" className="btn btn-primary sm:col-span-2">Record expense</button>
          </form>
        </Panel>
      </div>
    </>
  );
}
