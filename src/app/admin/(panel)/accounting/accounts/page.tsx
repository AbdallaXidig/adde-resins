import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { accountBalances } from "@/lib/finance";
import { saveAccountAction } from "../../../actions/finance";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { Empty, PageHeader, Panel, fmtMoney } from "@/components/admin/ui";

export const metadata = { title: "Accounts" };
const TYPES = [["CASH", "Cash"], ["BANK", "Bank account"], ["MOBILE_MONEY", "Mobile money"]] as const;
const TYPE_LABELS = Object.fromEntries(TYPES) as Record<string, string>;

function AccountFields({ v }: { v?: { name: string; type: string; openingBalance: unknown; notes: string | null } }) {
  return (
    <>
      <div><label className="field-label" htmlFor={`n-${v?.name ?? "new"}`}>Name</label><input id={`n-${v?.name ?? "new"}`} name="name" required maxLength={80} defaultValue={v?.name} className="field" placeholder="e.g. Office cash, Salaam Bank, EVC Plus 61…" /></div>
      <div><label className="field-label" htmlFor={`t-${v?.name ?? "new"}`}>Type</label><select id={`t-${v?.name ?? "new"}`} name="type" defaultValue={v?.type ?? "CASH"} className="field">{TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
      <div><label className="field-label" htmlFor={`o-${v?.name ?? "new"}`}>Opening balance (USD)</label><input id={`o-${v?.name ?? "new"}`} name="openingBalance" type="number" step="0.01" defaultValue={v ? Number(v.openingBalance) : 0} className="field" /></div>
      <div><label className="field-label" htmlFor={`x-${v?.name ?? "new"}`}>Notes</label><input id={`x-${v?.name ?? "new"}`} name="notes" maxLength={500} defaultValue={v?.notes ?? ""} className="field" /></div>
    </>
  );
}

export default async function Accounts({ searchParams }: { searchParams: FlashParams }) {
  await requirePermission("accounting");
  const sp = await searchParams;
  const { list } = await accountBalances();
  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title="Cash, bank and mobile money accounts" text="Choose an account when recording payments and expenses, and its balance is kept up to date." action={<Link href="/admin/accounting" className="btn btn-outline">Accounting</Link>} />
      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-4">
          {list.length === 0 ? <Empty>No accounts yet.</Empty> : list.map((a) => (
            <details key={a.id} className={`card p-5 ${a.active ? "" : "opacity-70"}`}>
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
                <span><span className="font-semibold text-brown">{a.name}</span> <span className="chip ms-1">{TYPE_LABELS[a.type]}</span>{!a.active && <span className="chip ms-1">Inactive</span>}</span>
                <span className="text-sm text-muted">In {fmtMoney(a.moneyIn)} · Out {fmtMoney(a.moneyOut)} · <span className={`text-base font-bold ${a.balance < 0 ? "text-burgundy" : "text-brown"}`}>{fmtMoney(a.balance)}</span></span>
              </summary>
              <form action={saveAccountAction} className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
                <input type="hidden" name="id" value={a.id} /><input type="hidden" name="_back" value="/admin/accounting/accounts" />
                <AccountFields v={a} />
                <label className="flex items-center gap-2 text-sm"><input type="hidden" name="active" value="off" /><input type="checkbox" name="active" value="on" defaultChecked={a.active} /> Active</label>
                <button className="btn btn-outline">Save</button>
              </form>
            </details>
          ))}
        </div>
        <Panel title="Add an account">
          <form action={saveAccountAction} className="grid gap-3">
            <input type="hidden" name="_back" value="/admin/accounting/accounts" />
            <AccountFields />
            <button className="btn btn-primary">Add account</button>
          </form>
        </Panel>
      </div>
    </>
  );
}
