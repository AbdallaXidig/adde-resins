import type { PurchaseStatus, SalesDocKind, SalesDocStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { PartyOption, ProductOption } from "./DocumentForm";

export const SALES_STATUS_LABELS: Record<SalesDocStatus, string> = {
  DRAFT: "Draft", SENT: "Sent", ACCEPTED: "Accepted", DECLINED: "Declined", ISSUED: "Unpaid",
  PARTIALLY_PAID: "Part paid", PAID: "Paid", VOID: "Void",
};
const SALES_TONE: Record<SalesDocStatus, string> = {
  DRAFT: "", SENT: "chip-warn", ACCEPTED: "chip-ok", DECLINED: "chip-bad", ISSUED: "chip-warn",
  PARTIALLY_PAID: "chip-warn", PAID: "chip-ok", VOID: "chip-bad",
};
export const KIND_LABELS: Record<SalesDocKind, string> = { QUOTATION: "Quotation", INVOICE: "Invoice" };

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = { DRAFT: "Draft", ORDERED: "Ordered", RECEIVED: "Received", CANCELLED: "Cancelled" };
const PURCHASE_TONE: Record<PurchaseStatus, string> = { DRAFT: "", ORDERED: "chip-warn", RECEIVED: "chip-ok", CANCELLED: "chip-bad" };

export function SalesBadge({ status, overdue }: { status: SalesDocStatus; overdue?: boolean }) {
  if (overdue) return <span className="chip chip-bad whitespace-nowrap">Overdue</span>;
  return <span className={`chip whitespace-nowrap ${SALES_TONE[status]}`}>{SALES_STATUS_LABELS[status]}</span>;
}
export function PurchaseBadge({ status }: { status: PurchaseStatus }) {
  return <span className={`chip whitespace-nowrap ${PURCHASE_TONE[status]}`}>{PURCHASE_STATUS_LABELS[status]}</span>;
}
export function PaidBadge({ total, paid }: { total: number; paid: number }) {
  if (total > 0 && paid >= total) return <span className="chip chip-ok">Paid</span>;
  if (paid > 0) return <span className="chip chip-warn">Part paid</span>;
  return <span className="chip">Unpaid</span>;
}

export const isOverdue = (d: { kind: SalesDocKind; status: SalesDocStatus; dueDate: Date | null }) =>
  d.kind === "INVOICE" && (d.status === "ISSUED" || d.status === "PARTIALLY_PAID") && !!d.dueDate && d.dueDate < new Date(new Date().toDateString());

export const dateInput = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
export const todayInput = () => new Date().toISOString().slice(0, 10);
export const addDays = (days: number) => new Date(Date.now() + days * 86400_000).toISOString().slice(0, 10);

export async function productOptions(): Promise<ProductOption[]> {
  const [products, lastCosts] = await Promise.all([
    prisma.product.findMany({ orderBy: [{ status: "asc" }, { name: "asc" }], select: { id: true, name: true, gradeOptions: true, pricePerKg: true } }),
    prisma.purchaseItem.findMany({ where: { productId: { not: null } }, distinct: ["productId"], orderBy: { purchase: { orderDate: "desc" } }, select: { productId: true, unitCost: true } }),
  ]);
  const cost = new Map(lastCosts.map((c) => [c.productId, Number(c.unitCost)]));
  return products.map((p) => ({ id: p.id, name: p.name, grades: p.gradeOptions, price: p.pricePerKg ? Number(p.pricePerKg) : null, cost: cost.get(p.id) ?? null }));
}

export async function customerOptions(): Promise<PartyOption[]> {
  const rows = await prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, company: true, phone: true, email: true }, take: 5000 });
  return rows.map((c) => ({ id: c.id, label: [c.name, c.company, c.phone ?? c.email].filter(Boolean).join(" · ") }));
}

export async function supplierOptions(): Promise<PartyOption[]> {
  const rows = await prisma.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, country: true, phone: true } });
  return rows.map((s) => ({ id: s.id, label: [s.name, s.country, s.phone].filter(Boolean).join(" · ") }));
}

export async function accountOptions() {
  return prisma.moneyAccount.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, type: true } });
}

export function Stat({ label, value, tone, href }: { label: string; value: string; tone?: "bad" | "ok"; href?: string }) {
  const body = (
    <>
      <p className={`font-serif text-2xl font-semibold sm:text-3xl ${tone === "bad" ? "text-burgundy" : tone === "ok" ? "text-[#1d5c2d]" : "text-brown"}`}>{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </>
  );
  return href ? <a href={href} className="card block p-5 transition-shadow hover:shadow-lift">{body}</a> : <div className="card p-5">{body}</div>;
}
