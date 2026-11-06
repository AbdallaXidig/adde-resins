// Sales, purchasing and accounting rules, against the real database.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  FinanceError, convertQuotation, deletePayment, priceLines, recordPayment, saveSalesDocument, savePurchase,
  setPurchaseStatus, setSalesStatus, createExpense, accountBalances,
} from "@/lib/finance";

const prisma = new PrismaClient();
const tag = `fin-${Date.now()}`;
const day = (s: string) => new Date(`${s}T00:00:00Z`);
let customerId = "", supplierId = "", productId = "", accountId = "";
let startStock: number | null = null;

beforeAll(async () => {
  customerId = (await prisma.customer.create({ data: { name: `${tag} buyer`, source: "WALK_IN" } })).id;
  supplierId = (await prisma.supplier.create({ data: { name: `${tag} supplier` } })).id;
  const p = await prisma.product.findFirstOrThrow({ where: { status: "PUBLISHED" } });
  productId = p.id;
  startStock = p.stockKg === null ? null : Number(p.stockKg);
  accountId = (await prisma.moneyAccount.create({ data: { name: `${tag} cash`, type: "CASH", openingBalance: 100 } })).id;
});

afterAll(async () => {
  await prisma.payment.deleteMany({ where: { OR: [{ customerId }, { supplierId }, { accountId }] } });
  await prisma.expense.deleteMany({ where: { accountId } });
  await prisma.salesDocument.deleteMany({ where: { customerId } });
  await prisma.purchase.deleteMany({ where: { supplierId } });
  await prisma.stockMovement.deleteMany({ where: { productId, reason: { contains: "ADI-" }, createdAt: { gte: new Date(Date.now() - 3600_000) } } });
  await prisma.product.update({ where: { id: productId }, data: { stockKg: startStock } });
  await prisma.customer.delete({ where: { id: customerId } });
  await prisma.supplier.delete({ where: { id: supplierId } });
  await prisma.moneyAccount.delete({ where: { id: accountId } });
  await prisma.$disconnect();
});

describe("totals", () => {
  it("prices per kg and converts MT to kg", () => {
    const { items, subtotal } = priceLines([
      { description: "A", quantity: 2, unit: "MT", price: 12.5 },
      { description: "B", quantity: 250, unit: "KG", price: 3.333 },
    ]);
    expect(Number(items[0].lineTotal)).toBe(25000);
    expect(Number(items[1].lineTotal)).toBe(833.25);
    expect(Number(subtotal)).toBe(25833.25);
  });
});

describe("sales, payments and stock", () => {
  it("runs a quotation through to a paid invoice", async () => {
    const quote = await saveSalesDocument(null, {
      kind: "QUOTATION", customerId, issueDate: day("2026-11-01"), dueDate: undefined, discount: 100, shipping: 50, tax: 0,
      shipTo: undefined, notes: undefined, internalNotes: undefined,
      lines: [{ productId, description: "Test resin", quantity: 1, unit: "MT", price: 10 }],
    }, "Test");
    expect(quote.number).toMatch(/^ADI-QUO-\d{4}-\d{5}$/);
    expect(Number(quote.total)).toBe(10000 - 100 + 50);

    const inv = await convertQuotation(quote.id, "Test");
    expect(inv.number).toMatch(/^ADI-INV-/);
    expect(inv.status).toBe("DRAFT");
    await expect(convertQuotation(quote.id, "Test")).rejects.toBeInstanceOf(FinanceError);

    await expect(recordPayment({ direction: "IN", documentId: inv.id, amount: 10, date: day("2026-11-02"), method: "CASH" }, "Test")).rejects.toThrow(/Issue the invoice/);

    await prisma.product.update({ where: { id: productId }, data: { stockKg: 5000 } });
    const issued = await setSalesStatus(inv.id, "ISSUED");
    expect(issued.status).toBe("ISSUED");
    expect(Number((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stockKg)).toBe(4000);

    const p1 = await recordPayment({ direction: "IN", documentId: inv.id, amount: 4000, date: day("2026-11-03"), method: "EVC_PLUS", accountId, reference: "EVC123" }, "Test");
    expect(p1.number).toMatch(/^ADI-RCT-/);
    expect((await prisma.salesDocument.findUniqueOrThrow({ where: { id: inv.id } })).status).toBe("PARTIALLY_PAID");
    await expect(recordPayment({ direction: "IN", documentId: inv.id, amount: 6000, date: day("2026-11-03"), method: "CASH" }, "Test")).rejects.toThrow(/more than the balance/);
    await recordPayment({ direction: "IN", documentId: inv.id, amount: 5950, date: day("2026-11-04"), method: "CASH", accountId }, "Test");
    expect((await prisma.salesDocument.findUniqueOrThrow({ where: { id: inv.id } })).status).toBe("PAID");

    await expect(setSalesStatus(inv.id, "VOID")).rejects.toThrow(/Delete the payments/);
    await deletePayment(p1.id);
    const after = await prisma.salesDocument.findUniqueOrThrow({ where: { id: inv.id } });
    expect(after.status).toBe("PARTIALLY_PAID");
    expect(Number(after.amountPaid)).toBe(5950);
  });

  it("keeps drafts editable and locks issued invoices", async () => {
    const base = { kind: "INVOICE" as const, customerId, issueDate: day("2026-11-05"), dueDate: undefined, discount: 0, shipping: 0, tax: 0, shipTo: undefined, notes: undefined, internalNotes: undefined };
    const d = await saveSalesDocument(null, { ...base, lines: [{ description: "Bags", quantity: 10, unit: "KG", price: 2 }] }, "Test");
    const edited = await saveSalesDocument(d.id, { ...base, lines: [{ description: "Bags", quantity: 20, unit: "KG", price: 2 }] }, "Test");
    expect(Number(edited.total)).toBe(40);
    await setSalesStatus(d.id, "ISSUED");
    await expect(saveSalesDocument(d.id, { ...base, lines: [{ description: "Bags", quantity: 1, unit: "KG", price: 1 }] }, "Test")).rejects.toThrow(/Only drafts/);
    await expect(saveSalesDocument(null, { ...base, discount: 999, lines: [{ description: "x", quantity: 1, unit: "KG", price: 1 }] }, "Test")).rejects.toThrow(/discount/);
  });
});

describe("purchases and accounts", () => {
  it("adds stock on receipt, tracks what is owed, and removes stock on cancel", async () => {
    const stockBefore = Number((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stockKg);
    const po = await savePurchase(null, {
      supplierId, supplierRef: "SUP-9", orderDate: day("2026-11-01"), expectedDate: undefined, shipping: 200, otherCosts: 0, notes: undefined,
      lines: [{ productId, description: "Raw resin", quantity: 2, unit: "MT", price: 4 }],
    }, "Test");
    expect(po.number).toMatch(/^ADI-PO-/);
    expect(Number(po.total)).toBe(8200);
    await expect(recordPayment({ direction: "OUT", purchaseId: po.id, amount: 100, date: day("2026-11-02"), method: "CASH" }, "Test")).rejects.toThrow(/ordered/);
    await setPurchaseStatus(po.id, "ORDERED");
    await setPurchaseStatus(po.id, "RECEIVED");
    expect(Number((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stockKg)).toBe(stockBefore + 2000);

    const out = await recordPayment({ direction: "OUT", purchaseId: po.id, amount: 3000, date: day("2026-11-03"), method: "BANK_TRANSFER", accountId }, "Test");
    expect(out.number).toMatch(/^ADI-PAY-/);
    await expect(setPurchaseStatus(po.id, "CANCELLED")).rejects.toThrow(/Delete the payments/);
    await deletePayment(out.id);
    await setPurchaseStatus(po.id, "CANCELLED");
    expect(Number((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stockKg)).toBe(stockBefore);
  });

  it("keeps account balances: opening + in − out − expenses", async () => {
    await createExpense({ date: day("2026-11-06"), category: "Transport & freight", description: "Truck", amount: 75.5, method: "CASH", accountId }, "Test");
    const { list } = await accountBalances();
    const acct = list.find((a) => a.id === accountId)!;
    // 100 opening + 5,950 received − 75.50 expense (the 3,000 supplier payment was deleted).
    expect(acct.balance).toBeCloseTo(100 + 5950 - 75.5, 2);
  });
});
