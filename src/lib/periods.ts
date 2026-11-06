/** Reporting periods for the accounting pages. Dates are UTC days; `to` is exclusive. */
export const PERIODS = [
  ["this-month", "This month"], ["last-month", "Last month"], ["this-quarter", "This quarter"],
  ["this-year", "This year"], ["last-year", "Last year"], ["last-12", "Last 12 months"], ["all", "All time"], ["custom", "Custom dates"],
] as const;
export type PeriodKey = (typeof PERIODS)[number][0];

const utc = (y: number, m: number, d = 1) => new Date(Date.UTC(y, m, d));
const isoDay = /^\d{4}-\d{2}-\d{2}$/;

export function resolvePeriod(key?: string, fromStr?: string, toStr?: string): { key: PeriodKey; from: Date; to: Date; label: string } {
  const now = new Date();
  const y = now.getUTCFullYear(), m = now.getUTCMonth();
  const k = (PERIODS.some(([p]) => p === key) ? key : "this-month") as PeriodKey;
  const label = PERIODS.find(([p]) => p === k)![1];
  switch (k) {
    case "last-month": return { key: k, from: utc(y, m - 1), to: utc(y, m), label };
    case "this-quarter": return { key: k, from: utc(y, m - (m % 3)), to: utc(y, m - (m % 3) + 3), label };
    case "this-year": return { key: k, from: utc(y, 0), to: utc(y + 1, 0), label };
    case "last-year": return { key: k, from: utc(y - 1, 0), to: utc(y, 0), label };
    case "last-12": return { key: k, from: utc(y, m - 11), to: utc(y, m + 1), label };
    case "all": return { key: k, from: utc(2000, 0), to: utc(y + 10, 0), label };
    case "custom": {
      const from = fromStr && isoDay.test(fromStr) ? new Date(`${fromStr}T00:00:00Z`) : utc(y, m);
      const toDay = toStr && isoDay.test(toStr) ? new Date(`${toStr}T00:00:00Z`) : utc(y, m + 1, 0);
      const to = new Date(toDay.getTime() + 86400_000);
      return { key: k, from, to, label: `${from.toISOString().slice(0, 10)} to ${toDay.toISOString().slice(0, 10)}` };
    }
    default: return { key: "this-month", from: utc(y, m), to: utc(y, m + 1), label };
  }
}

export const inPeriod = (p: { from: Date; to: Date }) => ({ gte: p.from, lt: p.to });
