import "server-only";
import { randomBytes } from "node:crypto";
import { Prisma, type PaymentMethod, type PurchaseStatus, type SalesDocStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./db";
import { nextReference } from "./references";
import { toKg } from "./validation";

/**
 * Sales documents (quotations and invoices), purchases, payments and expenses.
 * All totals are calculated here on the server; the browser only sends quantities and prices.
 */

/** A problem the staff member can fix; the message is shown to them as is. */
export class FinanceError extends Error {}

type Tx = Prisma.TransactionClient;
const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);
const ZERO = D(0);
const r2 = (d: Prisma.Decimal) => d.toDecimalPlaces(2);

// ---------- Input schemas ----------

const optText = (max: number) => z.string().trim().max(max).transform((v) => v || undefined).optional();
const amount = (label: string) => z.coerce.number({ message: `${label} must be a number` }).min(0, `${label} cannot be negative`).max(100_000_000, `${label} is too large`);
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date").transform((v) => new Date(`${v}T00:00:00Z`));
const optDate = z.string().transform((v, ctx) => {
  if (!v) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { ctx.addIssue({ code: "custom", message: "Enter a valid date" }); return z.NEVER; }
  return new Date(`${v}T00:00:00Z`);
}).optional();

export const lineSchema = z.object({
  productId: optText(40),
  description: z.string().trim().min(1, "Every line needs a product or description").max(300),
  grade: optText(80),
  quantity: z.coerce.number({ message: "Quantities must be numbers" }).positive("Quantities must be above zero").max(10_000_000, "Quantity is too large"),
  unit: z.enum(["KG", "MT"]),
  price: amount("Price"),
});
export type LineInput = z.infer<typeof lineSchema>;
const lines = z.array(lineSchema).min(1, "Add at least one line").max(100, "Too many lines");

export const salesDocSchema = z.object({
  kind: z.enum(["QUOTATION", "INVOICE"]),
  customerId: z.string().min(1, "Choose a customer").max(40),
  issueDate: dateStr,
  dueDate: optDate,
  discount: amount("Discount"),
  shipping: amount("Shipping"),
  tax: amount("Tax"),
  shipTo: optText(500),
  notes: optText(4000),
  internalNotes: optText(4000),
  lines,
});
export type SalesDocInput = z.infer<typeof salesDocSchema>;

export const purchaseSchema = z.object({
  supplierId: z.string().min(1, "Choose a supplier").max(40),
  supplierRef: optText(120),
  orderDate: dateStr,
  expectedDate: optDate,
  shipping: amount("Shipping"),
  otherCosts: amount("Other costs"),
  notes: optText(4000),
  lines,
});
export type PurchaseInput = z.infer<typeof purchaseSchema>;

export const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "BANK_TRANSFER", "EVC_PLUS", "ZAAD", "EDAHAB", "SAHAL", "CHEQUE", "CARD", "OTHER"];
export const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash", BANK_TRANSFER: "Bank transfer", EVC_PLUS: "EVC Plus", ZAAD: "Zaad", EDAHAB: "eDahab",
  SAHAL: "Sahal", CHEQUE: "Cheque", CARD: "Card", OTHER: "Other",
};

export const paymentSchema = z.object({
  direction: z.enum(["IN", "OUT"]),
  documentId: optText(40),
  purchaseId: optText(40),
  customerId: optText(40),
  supplierId: optText(40),
  amount: z.coerce.number({ message: "Amount must be a number" }).positive("Amount must be above zero").max(100_000_000),
  date: dateStr,
  method: z.enum(PAYMENT_METHODS as [PaymentMethod, ...PaymentMethod[]]),
  accountId: optText(40),
  reference: optText(120),
  notes: optText(1000),
});
export type PaymentInput = z.infer<typeof paymentSchema>;

export const EXPENSE_CATEGORIES = [
  "Transport & freight", "Customs & clearance", "Packaging", "Labour & wages", "Salaries", "Rent",
  "Utilities", "Communication", "Bank & transfer fees", "Government fees & licences", "Marketing",
  "Office supplies", "Travel", "Maintenance", "Other",
];

export const expenseSchema = z.object({
  date: dateStr,
  category: z.string().trim().min(1, "Choose a category").max(80),
  description: z.string().trim().min(1, "Describe the expense").max(300),
  amount: z.coerce.number({ message: "Amount must be a number" }).positive("Amount must be above zero").max(100_000_000),
  method: z.enum(PAYMENT_METHODS as [PaymentMethod, ...PaymentMethod[]]),
  accountId: optText(40),
  payee: optText(160),
  reference: optText(120),
  notes: optText(1000),
});
export type ExpenseInput = z.infer<typeof expenseSchema>;

/** First validation message, for a flash banner. */
export const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Please check the form.";

// ---------- Calculations ----------

export function priceLines(input: LineInput[]) {
  let subtotal = ZERO;
  const items = input.map((l, i) => {
    const lineTotal = r2(D(l.price).mul(toKg(l.quantity, l.unit)));
    subtotal = subtotal.add(lineTotal);
    return { productId: l.productId ?? null, description: l.description, grade: l.grade ?? null, quantity: D(l.quantity), unit: l.unit, price: D(l.price), lineTotal, sortOrder: i };
  });
  return { items, subtotal: r2(subtotal) };
}

/** Invoice payment state follows the money: never set by hand. */
function invoiceStatus(total: Prisma.Decimal, paid: Prisma.Decimal): SalesDocStatus {
  if (paid.gte(total) && total.gt(0)) return "PAID";
  if (paid.gt(0)) return "PARTIALLY_PAID";
  return "ISSUED";
}

async function checkProducts(tx: Tx, ids: (string | null)[]) {
  const wanted = [...new Set(ids.filter((v): v is string => !!v))];
  if (!wanted.length) return;
  const found = await tx.product.count({ where: { id: { in: wanted } } });
  if (found !== wanted.length) throw new FinanceError("One of the products no longer exists. Reload the page and try again.");
}

/**
 * Moves tracked stock. Sales skip products whose stock isn't tracked; receiving a purchase
 * starts tracking a product from zero, because the goods are now physically counted in.
 */
async function moveStock(tx: Tx, items: { productId: string | null; quantity: Prisma.Decimal; unit: "KG" | "MT" }[], sign: 1 | -1, reason: string, startTracking = false) {
  for (const item of items) {
    if (!item.productId) continue;
    const product = await tx.product.findUnique({ where: { id: item.productId }, select: { id: true, stockKg: true } });
    if (!product) continue;
    if (product.stockKg === null && !startTracking) continue;
    const changeKg = toKg(Number(item.quantity), item.unit) * sign;
    await tx.product.update({
      where: { id: product.id },
      data: product.stockKg === null ? { stockKg: changeKg } : { stockKg: { increment: changeKg } },
    });
    await tx.stockMovement.create({ data: { productId: product.id, changeKg, reason } });
  }
}

// ---------- Sales documents ----------

export async function saveSalesDocument(id: string | null, input: SalesDocInput, userName: string, link: { orderId?: string; quotationId?: string } = {}) {
  const { items, subtotal } = priceLines(input.lines);
  const total = r2(subtotal.sub(input.discount).add(input.shipping).add(input.tax));
  if (total.lt(0)) throw new FinanceError("The discount is larger than the total.");
  return prisma.$transaction(async (tx) => {
    await checkProducts(tx, items.map((i) => i.productId));
    const customer = await tx.customer.findUnique({ where: { id: input.customerId }, select: { id: true } });
    if (!customer) throw new FinanceError("That customer no longer exists.");
    const data = {
      customerId: input.customerId, issueDate: input.issueDate, dueDate: input.dueDate ?? null,
      discount: D(input.discount), shipping: D(input.shipping), tax: D(input.tax), subtotal, total,
      shipTo: input.shipTo ?? null, notes: input.notes ?? null, internalNotes: input.internalNotes ?? null,
    };
    const itemRows = items.map(({ price, ...i }) => ({ ...i, unitPrice: price }));
    if (id) {
      const doc = await tx.salesDocument.findUnique({ where: { id } });
      if (!doc) throw new FinanceError("Document not found.");
      if (doc.status !== "DRAFT") throw new FinanceError("Only drafts can be edited. Void it and create a new one instead.");
      await tx.salesItem.deleteMany({ where: { documentId: id } });
      return tx.salesDocument.update({ where: { id }, data: { ...data, items: { create: itemRows } } });
    }
    return tx.salesDocument.create({
      data: {
        ...data,
        kind: input.kind,
        number: await nextReference(tx, input.kind === "QUOTATION" ? "QUO" : "INV"),
        accessToken: randomBytes(18).toString("base64url"),
        createdByName: userName,
        orderId: link.orderId,
        quotationId: link.quotationId,
        items: { create: itemRows },
      },
    });
  });
}

/** Moves a quotation or invoice forward. Invoices take stock out when issued. */
export async function setSalesStatus(id: string, to: "SENT" | "ACCEPTED" | "DECLINED" | "ISSUED" | "VOID") {
  return prisma.$transaction(async (tx) => {
    const doc = await tx.salesDocument.findUnique({ where: { id }, include: { items: true, order: { select: { stockCommitted: true } }, _count: { select: { payments: true } } } });
    if (!doc) throw new FinanceError("Document not found.");
    if (doc.status === "VOID") throw new FinanceError("This document is void.");

    if (to === "VOID") {
      if (doc._count.payments > 0) throw new FinanceError("Delete the payments on this invoice before voiding it.");
      if (doc.stockCommitted) await moveStock(tx, doc.items, 1, `${doc.number}: voided, stock returned`);
      return tx.salesDocument.update({ where: { id }, data: { status: "VOID", stockCommitted: false } });
    }
    if (doc.kind === "QUOTATION") {
      if (to === "ISSUED") throw new FinanceError("Convert the quotation to an invoice first.");
      return tx.salesDocument.update({ where: { id }, data: { status: to } });
    }
    if (to !== "ISSUED") throw new FinanceError("That status is for quotations.");
    if (doc.status !== "DRAFT") throw new FinanceError("This invoice is already issued.");
    if (doc.total.lte(0)) throw new FinanceError("The invoice total is zero. Add prices before issuing it.");
    // A website order that was already confirmed has taken its stock out; don't take it twice.
    const takeStock = !doc.order?.stockCommitted;
    if (takeStock) await moveStock(tx, doc.items, -1, `${doc.number}: invoiced`);
    return tx.salesDocument.update({ where: { id }, data: { status: invoiceStatus(doc.total, doc.amountPaid), stockCommitted: takeStock } });
  });
}

export async function deleteDraftSalesDocument(id: string) {
  const doc = await prisma.salesDocument.findUnique({ where: { id }, include: { _count: { select: { payments: true } } } });
  if (!doc) throw new FinanceError("Document not found.");
  if (doc.status !== "DRAFT" || doc._count.payments > 0) throw new FinanceError("Only drafts without payments can be deleted. Void it instead.");
  await prisma.salesDocument.delete({ where: { id } });
}

const itemsToLines = (items: { productId: string | null; description: string; grade: string | null; quantity: Prisma.Decimal; unit: "KG" | "MT"; unitPrice?: Prisma.Decimal | null; unitPricePerKg?: Prisma.Decimal | null }[]): LineInput[] =>
  items.map((i) => ({
    productId: i.productId ?? undefined, description: i.description, grade: i.grade ?? undefined,
    quantity: Number(i.quantity), unit: i.unit, price: Number(i.unitPrice ?? i.unitPricePerKg ?? 0),
  }));

const today = () => new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");

export async function convertQuotation(id: string, userName: string) {
  const q = await prisma.salesDocument.findUnique({ where: { id }, include: { items: { orderBy: { sortOrder: "asc" } } } });
  if (!q || q.kind !== "QUOTATION") throw new FinanceError("Quotation not found.");
  if (q.status === "VOID" || q.status === "DECLINED") throw new FinanceError("This quotation was declined or voided.");
  const existing = await prisma.salesDocument.findFirst({ where: { quotationId: id, status: { not: "VOID" } } });
  if (existing) throw new FinanceError(`Already converted to ${existing.number}.`);
  const invoice = await saveSalesDocument(null, {
    kind: "INVOICE", customerId: q.customerId, issueDate: today(), dueDate: undefined,
    discount: Number(q.discount), shipping: Number(q.shipping), tax: Number(q.tax),
    shipTo: q.shipTo ?? undefined, notes: q.notes ?? undefined, internalNotes: q.internalNotes ?? undefined,
    lines: itemsToLines(q.items.map((i) => ({ ...i, description: i.description }))),
  }, userName, { quotationId: q.id, orderId: q.orderId ?? undefined });
  await prisma.salesDocument.update({ where: { id }, data: { status: "ACCEPTED" } });
  return invoice;
}

/** Starts a quotation or invoice from a website order or cart quotation. */
export async function salesDocFromOrder(orderId: string, kind: "QUOTATION" | "INVOICE", userName: string) {
  const o = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!o) throw new FinanceError("Order not found.");
  return saveSalesDocument(null, {
    kind, customerId: o.customerId, issueDate: today(), dueDate: undefined, discount: 0, shipping: 0, tax: 0,
    shipTo: [o.shippingPort, o.shippingCountry, o.shippingAddress].filter(Boolean).join(", ") || undefined,
    notes: undefined, internalNotes: `Prepared from website ${o.type === "ORDER" ? "order" : "cart quotation"} ${o.reference}.`,
    lines: itemsToLines(o.items.map((i) => ({ ...i, description: i.productName }))),
  }, userName, { orderId: o.id });
}

/** Starts a quotation from a website Request for Quotation. */
export async function quotationFromRfq(rfqId: string, userName: string) {
  const r = await prisma.rfq.findUnique({ where: { id: rfqId }, include: { product: { select: { pricePerKg: true } } } });
  if (!r) throw new FinanceError("Quotation request not found.");
  return saveSalesDocument(null, {
    kind: "QUOTATION", customerId: r.customerId, issueDate: today(), dueDate: new Date(today().getTime() + 14 * 86400_000),
    discount: 0, shipping: 0, tax: 0, shipTo: `${r.destinationPort}, ${r.destinationCountry}`, notes: r.packaging ? `Packaging: ${r.packaging}` : undefined,
    internalNotes: `Prepared from website RFQ ${r.reference}.${r.requirements ? ` Customer notes: ${r.requirements}` : ""}`.slice(0, 4000),
    lines: [{ productId: r.productId ?? undefined, description: r.productName, grade: r.grade ?? undefined, quantity: Number(r.quantity), unit: r.unit, price: Number(r.product?.pricePerKg ?? 0) }],
  }, userName);
}

// ---------- Purchases ----------

export async function savePurchase(id: string | null, input: PurchaseInput, userName: string) {
  const { items, subtotal } = priceLines(input.lines);
  const total = r2(subtotal.add(input.shipping).add(input.otherCosts));
  return prisma.$transaction(async (tx) => {
    await checkProducts(tx, items.map((i) => i.productId));
    const supplier = await tx.supplier.findUnique({ where: { id: input.supplierId }, select: { id: true } });
    if (!supplier) throw new FinanceError("That supplier no longer exists.");
    const data = {
      supplierId: input.supplierId, supplierRef: input.supplierRef ?? null, orderDate: input.orderDate,
      expectedDate: input.expectedDate ?? null, shipping: D(input.shipping), otherCosts: D(input.otherCosts),
      subtotal, total, notes: input.notes ?? null,
    };
    const itemRows = items.map(({ price, ...i }) => ({ ...i, unitCost: price }));
    if (id) {
      const p = await tx.purchase.findUnique({ where: { id } });
      if (!p) throw new FinanceError("Purchase not found.");
      if (p.status === "RECEIVED" || p.status === "CANCELLED") throw new FinanceError("Received or cancelled purchases can't be edited.");
      if (total.lt(p.amountPaid)) throw new FinanceError("The new total is less than what has already been paid.");
      await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
      return tx.purchase.update({ where: { id }, data: { ...data, items: { create: itemRows } } });
    }
    return tx.purchase.create({ data: { ...data, number: await nextReference(tx, "PO"), createdByName: userName, items: { create: itemRows } } });
  });
}

export async function setPurchaseStatus(id: string, to: PurchaseStatus) {
  return prisma.$transaction(async (tx) => {
    const p = await tx.purchase.findUnique({ where: { id }, include: { items: true, _count: { select: { payments: true } } } });
    if (!p) throw new FinanceError("Purchase not found.");
    if (p.status === "CANCELLED") throw new FinanceError("This purchase is cancelled.");
    if (to === "ORDERED") {
      if (p.status !== "DRAFT") throw new FinanceError("Only drafts can be marked as ordered.");
      return tx.purchase.update({ where: { id }, data: { status: "ORDERED" } });
    }
    if (to === "RECEIVED") {
      if (p.status === "RECEIVED") throw new FinanceError("Already received.");
      await moveStock(tx, p.items, 1, `${p.number}: received from supplier`, true);
      return tx.purchase.update({ where: { id }, data: { status: "RECEIVED", stockReceived: true, receivedDate: new Date() } });
    }
    if (to === "CANCELLED") {
      if (p._count.payments > 0) throw new FinanceError("Delete the payments on this purchase before cancelling it.");
      if (p.stockReceived) await moveStock(tx, p.items, -1, `${p.number}: cancelled, stock removed`);
      return tx.purchase.update({ where: { id }, data: { status: "CANCELLED", stockReceived: false } });
    }
    throw new FinanceError("Unknown status.");
  });
}

export async function deleteDraftPurchase(id: string) {
  const p = await prisma.purchase.findUnique({ where: { id }, include: { _count: { select: { payments: true } } } });
  if (!p) throw new FinanceError("Purchase not found.");
  if (p.status !== "DRAFT" || p._count.payments > 0) throw new FinanceError("Only drafts without payments can be deleted. Cancel it instead.");
  await prisma.purchase.delete({ where: { id } });
}

// ---------- Payments ----------

export async function recordPayment(input: PaymentInput, userName: string) {
  return prisma.$transaction(async (tx) => {
    if (input.accountId && !(await tx.moneyAccount.findUnique({ where: { id: input.accountId } }))) throw new FinanceError("That account no longer exists.");
    const amt = r2(D(input.amount));
    let customerId = input.customerId ?? null;
    let supplierId = input.supplierId ?? null;

    if (input.documentId) {
      const doc = await tx.salesDocument.findUnique({ where: { id: input.documentId } });
      if (!doc || doc.kind !== "INVOICE") throw new FinanceError("Payments are recorded against invoices.");
      if (!["ISSUED", "PARTIALLY_PAID"].includes(doc.status)) throw new FinanceError(doc.status === "PAID" ? "This invoice is already fully paid." : "Issue the invoice before recording a payment.");
      const balance = doc.total.sub(doc.amountPaid);
      if (amt.gt(balance)) throw new FinanceError(`That is more than the balance due (${balance.toFixed(2)}).`);
      const paid = doc.amountPaid.add(amt);
      await tx.salesDocument.update({ where: { id: doc.id }, data: { amountPaid: paid, status: invoiceStatus(doc.total, paid) } });
      customerId = doc.customerId;
    } else if (input.purchaseId) {
      const p = await tx.purchase.findUnique({ where: { id: input.purchaseId } });
      if (!p) throw new FinanceError("Purchase not found.");
      if (p.status === "DRAFT" || p.status === "CANCELLED") throw new FinanceError("Mark the purchase as ordered before paying the supplier.");
      const balance = p.total.sub(p.amountPaid);
      if (amt.gt(balance)) throw new FinanceError(`That is more than the balance owed (${balance.toFixed(2)}).`);
      await tx.purchase.update({ where: { id: p.id }, data: { amountPaid: p.amountPaid.add(amt) } });
      supplierId = p.supplierId;
    }
    const direction = input.documentId ? "IN" : input.purchaseId ? "OUT" : input.direction;
    return tx.payment.create({
      data: {
        number: await nextReference(tx, direction === "IN" ? "RCT" : "PAY"),
        direction, date: input.date, amount: amt, method: input.method, accountId: input.accountId ?? null,
        documentId: input.documentId ?? null, purchaseId: input.purchaseId ?? null, customerId, supplierId,
        reference: input.reference ?? null, notes: input.notes ?? null, createdByName: userName,
      },
    });
  });
}

export async function deletePayment(id: string) {
  return prisma.$transaction(async (tx) => {
    const pay = await tx.payment.findUnique({ where: { id } });
    if (!pay) throw new FinanceError("Payment not found.");
    if (pay.documentId) {
      const doc = await tx.salesDocument.findUniqueOrThrow({ where: { id: pay.documentId } });
      const paid = Prisma.Decimal.max(ZERO, doc.amountPaid.sub(pay.amount));
      await tx.salesDocument.update({ where: { id: doc.id }, data: { amountPaid: paid, ...(doc.status === "VOID" ? {} : { status: invoiceStatus(doc.total, paid) }) } });
    }
    if (pay.purchaseId) {
      const p = await tx.purchase.findUniqueOrThrow({ where: { id: pay.purchaseId } });
      await tx.purchase.update({ where: { id: p.id }, data: { amountPaid: Prisma.Decimal.max(ZERO, p.amountPaid.sub(pay.amount)) } });
    }
    await tx.payment.delete({ where: { id } });
    return pay;
  });
}

// ---------- Expenses ----------

export async function createExpense(input: ExpenseInput, userName: string) {
  return prisma.$transaction(async (tx) => {
    if (input.accountId && !(await tx.moneyAccount.findUnique({ where: { id: input.accountId } }))) throw new FinanceError("That account no longer exists.");
    return tx.expense.create({
      data: {
        number: await nextReference(tx, "EXP"), date: input.date, category: input.category, description: input.description,
        amount: r2(D(input.amount)), method: input.method, accountId: input.accountId ?? null, payee: input.payee ?? null,
        reference: input.reference ?? null, notes: input.notes ?? null, createdByName: userName,
      },
    });
  });
}

// ---------- Reporting helpers ----------

/** Balance of every money account: opening balance + money in − money out − expenses. */
export async function accountBalances() {
  const [accounts, ins, outs, exps] = await Promise.all([
    prisma.moneyAccount.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.payment.groupBy({ by: ["accountId"], where: { direction: "IN" }, _sum: { amount: true } }),
    prisma.payment.groupBy({ by: ["accountId"], where: { direction: "OUT" }, _sum: { amount: true } }),
    prisma.expense.groupBy({ by: ["accountId"], _sum: { amount: true } }),
  ]);
  const get = (rows: { accountId: string | null; _sum: { amount: Prisma.Decimal | null } }[], id: string | null) =>
    Number(rows.find((r) => r.accountId === id)?._sum.amount ?? 0);
  const list = accounts.map((a) => ({
    ...a, moneyIn: get(ins, a.id), moneyOut: get(outs, a.id) + get(exps, a.id),
    balance: Number(a.openingBalance) + get(ins, a.id) - get(outs, a.id) - get(exps, a.id),
  }));
  const unassigned = { moneyIn: get(ins, null), moneyOut: get(outs, null) + get(exps, null) };
  return { list, unassigned };
}

export const balanceDue = (d: { total: Prisma.Decimal; amountPaid: Prisma.Decimal }) => Number(d.total) - Number(d.amountPaid);
