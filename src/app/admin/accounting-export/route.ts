import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { METHOD_LABELS } from "@/lib/finance";
import { inPeriod, resolvePeriod } from "@/lib/periods";

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
/** Quotes a CSV cell; values that start like a formula are prefixed so Excel shows them as text. */
const cell = (v: unknown) => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows: unknown[][]) => "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");

/** CSV exports for the accountant. Opens directly in Excel or Google Sheets. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "accounting")) return new NextResponse("Not allowed", { status: 403 });
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const period = resolvePeriod(url.searchParams.get("period") ?? "", url.searchParams.get("from") ?? "", url.searchParams.get("to") ?? "");
  const range = inPeriod(period);
  let rows: unknown[][];

  if (type === "invoices") {
    const docs = await prisma.salesDocument.findMany({ where: { kind: "INVOICE", status: { not: "DRAFT" }, issueDate: range }, orderBy: { issueDate: "asc" }, include: { customer: true } });
    rows = [["Number", "Date", "Due", "Customer", "Company", "Status", "Subtotal", "Discount", "Shipping", "Tax", "Total", "Paid", "Balance"],
      ...docs.map((d) => [d.number, day(d.issueDate), day(d.dueDate), d.customer.name, d.customer.company, d.status, d.subtotal, d.discount, d.shipping, d.tax, d.total, d.amountPaid, d.status === "VOID" ? 0 : Number(d.total) - Number(d.amountPaid)])];
  } else if (type === "payments") {
    const pays = await prisma.payment.findMany({ where: { date: range }, orderBy: { date: "asc" }, include: { account: true, document: true, purchase: true, customer: true, supplier: true } });
    rows = [["Number", "Date", "Direction", "Amount", "Method", "Account", "Invoice", "Purchase", "Customer", "Supplier", "Reference", "Notes"],
      ...pays.map((p) => [p.number, day(p.date), p.direction === "IN" ? "In" : "Out", p.amount, METHOD_LABELS[p.method], p.account?.name, p.document?.number, p.purchase?.number, p.customer?.name, p.supplier?.name, p.reference, p.notes])];
  } else if (type === "expenses") {
    const exps = await prisma.expense.findMany({ where: { date: range }, orderBy: { date: "asc" }, include: { account: true } });
    rows = [["Number", "Date", "Category", "Description", "Amount", "Method", "Account", "Paid to", "Reference"],
      ...exps.map((e) => [e.number, day(e.date), e.category, e.description, e.amount, METHOD_LABELS[e.method], e.account?.name, e.payee, e.reference])];
  } else if (type === "purchases") {
    const ps = await prisma.purchase.findMany({ where: { status: { not: "DRAFT" }, orderDate: range }, orderBy: { orderDate: "asc" }, include: { supplier: true } });
    rows = [["Number", "Order date", "Received", "Supplier", "Supplier ref", "Status", "Goods", "Shipping", "Other costs", "Total", "Paid", "Owed"],
      ...ps.map((p) => [p.number, day(p.orderDate), day(p.receivedDate), p.supplier.name, p.supplierRef, p.status, p.subtotal, p.shipping, p.otherCosts, p.total, p.amountPaid, p.status === "CANCELLED" ? 0 : Number(p.total) - Number(p.amountPaid)])];
  } else {
    return new NextResponse("Unknown export", { status: 400 });
  }
  const name = `adde-${type}-${day(period.from)}-to-${day(new Date(period.to.getTime() - 1))}.csv`;
  return new NextResponse(csv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" } });
}
