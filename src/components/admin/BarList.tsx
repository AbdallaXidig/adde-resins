// Ranked horizontal bars: one series, so the title names it and no legend is needed.
// Each bar has a hover title and a visible value; a table view follows for screen readers.
export function BarList({ title, rows, unit = "", empty = "No data yet." }: { title: string; rows: { label: string; value: number }[]; unit?: string; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const fmt = (v: number) => `${v.toLocaleString("en", { maximumFractionDigits: 1 })}${unit}`;
  return (
    <figure className="card p-5">
      <figcaption className="mb-4 text-lg font-semibold text-brown">{title}</figcaption>
      {rows.length === 0 ? <p className="py-6 text-center text-sm text-muted">{empty}</p> : (
        <>
          <ul className="space-y-2.5" aria-hidden>
            {rows.map((r) => (
              <li key={r.label} className="group grid grid-cols-[minmax(90px,34%)_1fr] items-center gap-3 text-sm" title={`${r.label}: ${fmt(r.value)}`}>
                <span className="truncate text-charcoal">{r.label}</span>
                <span className="flex items-center gap-2">
                  <span className="h-4 max-w-[calc(100%-4.5rem)] rounded-e bg-[#c9520c] transition-opacity group-hover:opacity-80" style={{ width: `${Math.max(1.5, (r.value / max) * 100)}%` }} />
                  <span className="whitespace-nowrap text-xs font-semibold text-charcoal">{fmt(r.value)}</span>
                </span>
              </li>
            ))}
          </ul>
          <table className="sr-only"><caption>{title}</caption><tbody>{rows.map((r) => <tr key={r.label}><th scope="row">{r.label}</th><td>{fmt(r.value)}</td></tr>)}</tbody></table>
        </>
      )}
    </figure>
  );
}
