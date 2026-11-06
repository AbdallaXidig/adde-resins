import { PERIODS, type PeriodKey } from "@/lib/periods";

export function PeriodPicker({ value, from, to }: { value: PeriodKey; from?: string; to?: string }) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-2">
      <label className="sr-only" htmlFor="period">Period</label>
      <select id="period" name="period" defaultValue={value} className="field w-auto">{PERIODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <label className="text-xs text-muted">From<input name="from" type="date" defaultValue={from} className="field mt-0.5 w-auto" /></label>
      <label className="text-xs text-muted">To<input name="to" type="date" defaultValue={to} className="field mt-0.5 w-auto" /></label>
      <button className="btn btn-outline">Show</button>
    </form>
  );
}
