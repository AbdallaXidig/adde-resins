"use server";
import { Prisma, type AccountType, type CustomerSource, type PurchaseStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit, requirePermission } from "@/lib/auth";
import { done, fail, optStr, str } from "@/lib/admin-helpers";
import {
  FinanceError, convertQuotation, createExpense, deleteDraftPurchase, deleteDraftSalesDocument, deletePayment,
  expenseSchema, firstIssue, paymentSchema, purchaseSchema, recordPayment, salesDocFromOrder, salesDocSchema,
  quotationFromRfq, savePurchase, saveSalesDocument, setPurchaseStatus, setSalesStatus,
} from "@/lib/finance";

const SOURCES: CustomerSource[] = ["WEBSITE", "WALK_IN", "PHONE", "WHATSAPP", "REFERRAL", "TRADE_FAIR", "OTHER"];
const ACCOUNT_TYPES: AccountType[] = ["CASH", "BANK", "MOBILE_MONEY"];

/** Turns expected problems into a flash message on the page the form came from. */
async function attempt<T>(f: FormData, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof FinanceError) fail(f, e.message);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") fail(f, "That email address is already used by another record.");
    throw e;
  }
}

/** A hidden "off" plus a checkbox "on": the box wins when ticked. No field at all means active. */
const activeFlag = (f: FormData) => (f.has("active") ? f.getAll("active").includes("on") : true);

function parseLines(f: FormData) {
  try {
    const v = JSON.parse(str(f, "lines", 200_000) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// ---------- Customers ----------

function customerData(f: FormData, prefix = "") {
  const g = (k: string, max?: number) => optStr(f, `${prefix}${k}`, max);
  const source = str(f, `${prefix}source`) as CustomerSource;
  const email = g("email", 200)?.toLowerCase() ?? null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(f, "Enter a valid email address, or leave it empty.");
  return {
    name: str(f, `${prefix}name`, 120), email, company: g("company", 160), phone: g("phone", 40),
    country: g("country", 80), address: g("address", 500), source: SOURCES.includes(source) ? source : "OTHER" as CustomerSource,
  };
}

export async function saveCustomer(f: FormData) {
  const user = await requirePermission("customers");
  const id = str(f, "id", 40);
  const data = { ...customerData(f), notes: optStr(f, "notes") };
  if (!data.name) fail(f, "Name is required.");
  const row = await attempt(f, () => id ? prisma.customer.update({ where: { id }, data }) : prisma.customer.create({ data }));
  await audit(user.id, id ? "update" : "create", "Customer", row.id, { name: data.name });
  done(`/admin/customers/${row.id}`, id ? "Customer saved" : "Customer added");
}

// ---------- Sales: quotations and invoices ----------

export async function saveSalesDoc(f: FormData) {
  const user = await requirePermission("sales");
  const id = str(f, "id", 40) || null;
  let customerId = str(f, "customerId", 40);
  if (customerId === "__new") {
    const c = customerData(f, "new_");
    if (!c.name) fail(f, "Enter the new customer's name.");
    const created = await attempt(f, () => prisma.customer.create({ data: c }));
    await audit(user.id, "create", "Customer", created.id, { name: c.name });
    customerId = created.id;
  }
  const parsed = salesDocSchema.safeParse({
    kind: str(f, "kind"), customerId, issueDate: str(f, "issueDate"), dueDate: str(f, "dueDate"),
    discount: str(f, "discount") || 0, shipping: str(f, "shipping") || 0, tax: str(f, "tax") || 0,
    shipTo: str(f, "shipTo"), notes: str(f, "notes"), internalNotes: str(f, "internalNotes"), lines: parseLines(f),
  });
  if (!parsed.success) fail(f, firstIssue(parsed.error));
  const doc = await attempt(f, () => saveSalesDocument(id, parsed.data, user.name));
  await audit(user.id, id ? "update" : "create", "SalesDocument", doc.id, { number: doc.number, total: doc.total.toString() });
  done(`/admin/sales/${doc.id}`, id ? "Saved" : `${doc.kind === "QUOTATION" ? "Quotation" : "Invoice"} ${doc.number} created`);
}

const SALES_TO = ["SENT", "ACCEPTED", "DECLINED", "ISSUED", "VOID"] as const;
export async function changeSalesStatus(f: FormData) {
  const user = await requirePermission("sales");
  const id = str(f, "id", 40);
  const to = str(f, "to") as (typeof SALES_TO)[number];
  if (!SALES_TO.includes(to)) fail(f, "Unknown status.");
  const doc = await attempt(f, () => setSalesStatus(id, to));
  await audit(user.id, "status", "SalesDocument", id, { number: doc.number, status: doc.status });
  done(`/admin/sales/${id}`, `${doc.number} updated`);
}

export async function convertQuotationAction(f: FormData) {
  const user = await requirePermission("sales");
  const inv = await attempt(f, () => convertQuotation(str(f, "id", 40), user.name));
  await audit(user.id, "create", "SalesDocument", inv.id, { number: inv.number, from: str(f, "id", 40) });
  done(`/admin/sales/${inv.id}`, `Invoice ${inv.number} created as a draft. Check it, then issue it.`);
}

export async function salesDocFromOrderAction(f: FormData) {
  const user = await requirePermission("sales");
  const kind = str(f, "kind") === "QUOTATION" ? "QUOTATION" : "INVOICE";
  const doc = await attempt(f, () => salesDocFromOrder(str(f, "orderId", 40), kind, user.name));
  await audit(user.id, "create", "SalesDocument", doc.id, { number: doc.number, order: str(f, "orderId", 40) });
  done(`/admin/sales/${doc.id}/edit`, `${doc.number} created from the website request. Set the prices, then save.`);
}

export async function quotationFromRfqAction(f: FormData) {
  const user = await requirePermission("sales");
  const doc = await attempt(f, () => quotationFromRfq(str(f, "rfqId", 40), user.name));
  await audit(user.id, "create", "SalesDocument", doc.id, { number: doc.number, rfq: str(f, "rfqId", 40) });
  done(`/admin/sales/${doc.id}/edit`, `${doc.number} created from the request. Set the price, then save.`);
}

export async function deleteSalesDraft(f: FormData) {
  const user = await requirePermission("sales");
  const id = str(f, "id", 40);
  await attempt(f, () => deleteDraftSalesDocument(id));
  await audit(user.id, "delete", "SalesDocument", id);
  done("/admin/sales", "Draft deleted");
}

// ---------- Suppliers and purchases ----------

function supplierData(f: FormData, prefix = "") {
  const g = (k: string, max?: number) => optStr(f, `${prefix}${k}`, max);
  return {
    name: str(f, `${prefix}name`, 160), country: g("country", 80), contact: g("contact", 120), email: g("email", 200),
    phone: g("phone", 40), address: g("address", 500),
  };
}

export async function saveSupplierRecord(f: FormData) {
  const user = await requirePermission("purchases");
  const id = str(f, "id", 40);
  const data = { ...supplierData(f), notes: optStr(f, "notes"), active: activeFlag(f) };
  if (!data.name) fail(f, "Supplier name is required.");
  const row = id ? await prisma.supplier.update({ where: { id }, data }) : await prisma.supplier.create({ data });
  await audit(user.id, id ? "update" : "create", "Supplier", row.id, { name: data.name });
  done(`/admin/suppliers/${row.id}`, id ? "Supplier saved" : "Supplier added");
}

export async function savePurchaseAction(f: FormData) {
  const user = await requirePermission("purchases");
  const id = str(f, "id", 40) || null;
  let supplierId = str(f, "supplierId", 40);
  if (supplierId === "__new") {
    const s = supplierData(f, "new_");
    if (!s.name) fail(f, "Enter the new supplier's name.");
    const created = await prisma.supplier.create({ data: s });
    await audit(user.id, "create", "Supplier", created.id, { name: s.name });
    supplierId = created.id;
  }
  const parsed = purchaseSchema.safeParse({
    supplierId, supplierRef: str(f, "supplierRef"), orderDate: str(f, "orderDate"), expectedDate: str(f, "expectedDate"),
    shipping: str(f, "shipping") || 0, otherCosts: str(f, "otherCosts") || 0, notes: str(f, "notes"), lines: parseLines(f),
  });
  if (!parsed.success) fail(f, firstIssue(parsed.error));
  const p = await attempt(f, () => savePurchase(id, parsed.data, user.name));
  await audit(user.id, id ? "update" : "create", "Purchase", p.id, { number: p.number, total: p.total.toString() });
  done(`/admin/purchases/${p.id}`, id ? "Saved" : `Purchase ${p.number} created`);
}

export async function changePurchaseStatus(f: FormData) {
  const user = await requirePermission("purchases");
  const id = str(f, "id", 40);
  const to = str(f, "to") as PurchaseStatus;
  const p = await attempt(f, () => setPurchaseStatus(id, to));
  await audit(user.id, "status", "Purchase", id, { number: p.number, status: p.status });
  done(`/admin/purchases/${id}`, to === "RECEIVED" ? `${p.number} received. Tracked stock has been added.` : `${p.number} updated`);
}

export async function deletePurchaseDraft(f: FormData) {
  const user = await requirePermission("purchases");
  const id = str(f, "id", 40);
  await attempt(f, () => deleteDraftPurchase(id));
  await audit(user.id, "delete", "Purchase", id);
  done("/admin/purchases", "Draft deleted");
}

// ---------- Payments, expenses, accounts ----------

export async function recordPaymentAction(f: FormData) {
  const user = await requirePermission("accounting");
  const parsed = paymentSchema.safeParse({
    direction: str(f, "direction") || "IN", documentId: str(f, "documentId"), purchaseId: str(f, "purchaseId"),
    customerId: str(f, "customerId"), supplierId: str(f, "supplierId"), amount: str(f, "amount"), date: str(f, "date"),
    method: str(f, "method"), accountId: str(f, "accountId"), reference: str(f, "reference"), notes: str(f, "notes"),
  });
  if (!parsed.success) fail(f, firstIssue(parsed.error));
  const pay = await attempt(f, () => recordPayment(parsed.data, user.name));
  await audit(user.id, "create", "Payment", pay.id, { number: pay.number, amount: pay.amount.toString(), direction: pay.direction });
  done(str(f, "_back") || "/admin/accounting/payments", `Payment ${pay.number} recorded`);
}

export async function deletePaymentAction(f: FormData) {
  const user = await requirePermission("accounting");
  const pay = await attempt(f, () => deletePayment(str(f, "id", 40)));
  await audit(user.id, "delete", "Payment", pay.id, { number: pay.number, amount: pay.amount.toString() });
  done(str(f, "_back") || "/admin/accounting/payments", `Payment ${pay.number} deleted`);
}

export async function createExpenseAction(f: FormData) {
  const user = await requirePermission("accounting");
  const parsed = expenseSchema.safeParse({
    date: str(f, "date"), category: str(f, "category"), description: str(f, "description"), amount: str(f, "amount"),
    method: str(f, "method"), accountId: str(f, "accountId"), payee: str(f, "payee"), reference: str(f, "reference"), notes: str(f, "notes"),
  });
  if (!parsed.success) fail(f, firstIssue(parsed.error));
  const e = await attempt(f, () => createExpense(parsed.data, user.name));
  await audit(user.id, "create", "Expense", e.id, { number: e.number, amount: e.amount.toString() });
  done("/admin/accounting/expenses", `Expense ${e.number} recorded`);
}

export async function deleteExpenseAction(f: FormData) {
  const user = await requirePermission("accounting");
  const id = str(f, "id", 40);
  const e = await prisma.expense.delete({ where: { id } });
  await audit(user.id, "delete", "Expense", id, { number: e.number, amount: e.amount.toString() });
  done("/admin/accounting/expenses", `Expense ${e.number} deleted`);
}

export async function saveAccountAction(f: FormData) {
  const user = await requirePermission("accounting");
  const id = str(f, "id", 40);
  const name = str(f, "name", 80);
  const type = str(f, "type") as AccountType;
  const opening = Number(str(f, "openingBalance") || 0);
  if (!name) fail(f, "Account name is required.");
  if (!ACCOUNT_TYPES.includes(type)) fail(f, "Choose an account type.");
  if (!Number.isFinite(opening)) fail(f, "Opening balance must be a number.");
  const data = { name, type, openingBalance: new Prisma.Decimal(opening).toDecimalPlaces(2), notes: optStr(f, "notes", 500), active: activeFlag(f) };
  const row = await attempt(f, async () => {
    try {
      return id ? await prisma.moneyAccount.update({ where: { id }, data }) : await prisma.moneyAccount.create({ data });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new FinanceError("An account with that name already exists.");
      throw e;
    }
  });
  await audit(user.id, id ? "update" : "create", "MoneyAccount", row.id, { name });
  done("/admin/accounting/accounts", "Account saved");
}
