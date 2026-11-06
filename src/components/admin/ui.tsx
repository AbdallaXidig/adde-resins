import Link from "next/link";
import type { InquiryStatus, WorkflowStatus } from "@prisma/client";
import { INQUIRY_LABELS, STATUS_LABELS } from "@/lib/status";

export function PageHeader({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-3xl font-semibold">{title}</h1>{text && <p className="mt-1 text-muted">{text}</p>}</div>
      {action}
    </div>
  );
}

const TONE: Record<string, string> = {
  PENDING: "chip-warn", UNDER_REVIEW: "chip-warn", QUOTATION_SENT: "", CONFIRMED: "chip-ok", PROCESSING: "",
  READY_FOR_SHIPMENT: "", SHIPPED: "chip-ok", DELIVERED: "chip-ok", CANCELLED: "chip-bad",
  NEW: "chip-warn", IN_PROGRESS: "", RESOLVED: "chip-ok", ARCHIVED: "",
};

export function StatusBadge({ status }: { status: WorkflowStatus | InquiryStatus }) {
  const label = (STATUS_LABELS as Record<string, string>)[status] ?? (INQUIRY_LABELS as Record<string, string>)[status] ?? status;
  return <span className={`chip whitespace-nowrap ${TONE[status] ?? ""}`}>{label}</span>;
}

export function Panel({ title, children, className = "", action }: { title?: string; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <section className={`card p-5 ${className}`}>
      {title && <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">{title}</h2>{action}</div>}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-muted">{children}</p>;
}

export function SearchBar({ placeholder, defaultValue, children }: { placeholder: string; defaultValue?: string; children?: React.ReactNode }) {
  return (
    <form method="get" className="mb-4 flex flex-wrap gap-2" role="search">
      <label className="sr-only" htmlFor="q">Search</label>
      <input id="q" name="q" type="search" defaultValue={defaultValue} placeholder={placeholder} className="field max-w-xs" />
      {children}
      <button type="submit" className="btn btn-outline">Filter</button>
    </form>
  );
}

export function Pager({ page, total, perPage, params }: { page: number; total: number; perPage: number; params: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  const href = (p: number) => `?${new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([, v]) => v)) as Record<string, string>, page: String(p) })}`;
  return (
    <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
      <span className="text-muted">Page {page} of {pages} ({total} records)</span>
      <span className="flex gap-2">
        {page > 1 && <Link className="btn btn-outline min-h-9 py-1.5" href={href(page - 1)}>Previous</Link>}
        {page < pages && <Link className="btn btn-outline min-h-9 py-1.5" href={href(page + 1)}>Next</Link>}
      </span>
    </nav>
  );
}

export const fmtDate = (d: Date | string | null | undefined) =>
  d ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d)) : "—";
export const fmtDateTime = (d: Date | string) =>
  new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d));
export const fmtMoney = (n: number | null | undefined, currency = "USD") =>
  n === null || n === undefined ? "—" : new Intl.NumberFormat("en", { style: "currency", currency }).format(n);
export const fmtQty = (q: number | string, unit: string) => `${Number(q).toLocaleString("en")} ${unit}`;
export const pageNum = (v: unknown) => Math.max(1, Number.parseInt(String(v ?? "1"), 10) || 1);
