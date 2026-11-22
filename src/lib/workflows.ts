import "server-only";
import { randomBytes } from "node:crypto";
import { Prisma, type WorkflowStatus } from "@prisma/client";
import { prisma } from "./db";
import { nextReference } from "./references";
import { notifyStaff } from "./mail";
import { stockAction } from "./status";
import { toKg, type InquiryInput, type OrderInput, type RfqInput } from "./validation";

function upsertCustomer(
  tx: Prisma.TransactionClient,
  c: { email: string; name: string; company?: string; phone?: string; country?: string },
) {
  // Public forms can add missing details, but cannot rewrite an existing customer's record.
  return tx.customer.upsert({
    where: { email: c.email },
    create: { email: c.email, name: c.name, company: c.company, phone: c.phone, country: c.country },
    update: {},
  });
}

export async function createRfq(input: RfqInput) {
  const rfq = await prisma.$transaction(async (tx) => {
    const customer = await upsertCustomer(tx, { ...input, country: input.destinationCountry });
    const product = input.productId
      ? await tx.product.findFirst({ where: { id: input.productId, status: "PUBLISHED" } })
      : null;
    return tx.rfq.create({
      data: {
        reference: await nextReference(tx, "RFQ"),
        customerId: customer.id,
        productId: product?.id,
        productName: product?.name ?? input.productName,
        grade: input.grade,
        packaging: input.packaging,
        quantity: input.quantity,
        unit: input.unit,
        destinationCountry: input.destinationCountry,
        destinationPort: input.destinationPort,
        deliveryDate: input.deliveryDate ? new Date(input.deliveryDate) : null,
        requirements: input.requirements,
        locale: input.locale,
        statusEvents: { create: { toStatus: "PENDING", note: "Submitted on website" } },
      },
    });
  });
  await notifyStaff(`New RFQ ${rfq.reference}`, {
    Reference: rfq.reference,
    Product: rfq.productName,
    Grade: rfq.grade,
    Quantity: `${input.quantity} ${input.unit}`,
    Destination: `${input.destinationPort}, ${input.destinationCountry}`,
    Customer: `${input.name} (${input.company}) ${input.email}`,
  });
  return rfq;
}

export async function createInquiry(input: InquiryInput) {
  const inquiry = await prisma.$transaction(async (tx) => {
    const customer = await upsertCustomer(tx, input);
    return tx.inquiry.create({
      data: {
        reference: await nextReference(tx, "INQ"),
        customerId: customer.id,
        name: input.name,
        email: input.email,
        phone: input.phone,
        company: input.company,
        country: input.country,
        category: input.category,
        subject: input.subject,
        message: input.message,
        locale: input.locale,
      },
    });
  });
  await notifyStaff(`New inquiry ${inquiry.reference}`, {
    Reference: inquiry.reference,
    Category: input.category,
    From: `${input.name} ${input.email}`,
    Message: input.message,
  });
  return inquiry;
}

export class OrderProblem extends Error {
  constructor(public code: "productUnavailable" | "belowMoq", public productName: string) {
    super(code);
  }
}

export async function createOrder(input: OrderInput) {
  const order = await prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: { id: { in: input.items.map((i) => i.productId) }, status: "PUBLISHED" },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    let subtotal = new Prisma.Decimal(0);
    let unpriced = false;
    const items = input.items.map((item) => {
      const p = byId.get(item.productId);
      if (!p || !p.cartEnabled || p.availability === "UNAVAILABLE") {
        throw new OrderProblem("productUnavailable", p?.name ?? item.productId);
      }
      const kg = toKg(item.quantity, item.unit);
      if (p.moq !== null && kg < toKg(Number(p.moq), p.moqUnit)) throw new OrderProblem("belowMoq", p.name);
      // Prices always come from the database, never from the browser.
      const price = p.priceVisible ? p.pricePerKg : null;
      const lineTotal = price ? price.mul(kg).toDecimalPlaces(2) : null;
      if (lineTotal) subtotal = subtotal.add(lineTotal);
      else unpriced = true;
      return {
        productId: p.id,
        productName: p.name,
        grade: item.grade,
        packaging: item.packaging,
        quantity: item.quantity,
        unit: item.unit,
        unitPricePerKg: price,
        lineTotal,
      };
    });

    const customer = await upsertCustomer(tx, { ...input, country: input.country ?? input.shippingCountry });
    return tx.order.create({
      data: {
        reference: await nextReference(tx, "ORD"),
        accessToken: randomBytes(18).toString("base64url"),
        type: input.type,
        customerId: customer.id,
        shippingCountry: input.shippingCountry,
        shippingPort: input.shippingPort,
        shippingAddress: input.shippingAddress,
        notes: input.notes,
        subtotal: subtotal.gt(0) ? subtotal : null,
        hasUnpricedItems: unpriced,
        locale: input.locale,
        items: { create: items },
        statusEvents: {
          create: { toStatus: "PENDING", note: input.type === "ORDER" ? "Order placed on website" : "Cart sent as quotation request" },
        },
      },
      include: { items: true },
    });
  });
  await notifyStaff(`New ${input.type === "ORDER" ? "order" : "cart quotation"} ${order.reference}`, {
    Reference: order.reference,
    Customer: `${input.name} ${input.email}`,
    Destination: [input.shippingPort, input.shippingCountry].filter(Boolean).join(", "),
    Items: order.items.map((i) => `${i.productName} x ${i.quantity} ${i.unit}`).join("; "),
  });
  return order;
}

export async function updateRfqStatus(id: string, to: WorkflowStatus, userId: string, note?: string) {
  await prisma.$transaction(async (tx) => {
    const rfq = await tx.rfq.findUniqueOrThrow({ where: { id } });
    if (rfq.status === to && !note) return;
    await tx.rfq.update({ where: { id }, data: { status: to } });
    await tx.statusEvent.create({ data: { rfqId: id, fromStatus: rfq.status, toStatus: to, note, userId } });
  });
}

export async function updateOrderStatus(id: string, to: WorkflowStatus, userId: string, note?: string) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id }, include: { items: true } });
    if (order.status === to && !note) return;

    let action = stockAction(to, order.stockCommitted);
    // An invoice issued from this order has already taken the stock; don't take it twice.
    if (action === "commit" && (await tx.salesDocument.count({ where: { orderId: id, kind: "INVOICE", stockCommitted: true } })) > 0) action = null;
    if (action) {
      const sign = action === "commit" ? -1 : 1;
      for (const item of order.items) {
        if (!item.productId) continue;
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || product.stockKg === null) continue; // stock not tracked for this product
        const changeKg = toKg(Number(item.quantity), item.unit) * sign;
        await tx.product.update({ where: { id: product.id }, data: { stockKg: { increment: changeKg } } });
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            changeKg,
            orderId: order.id,
            reason: `${order.reference}: ${action === "commit" ? "committed" : "released"}`,
          },
        });
      }
    }
    await tx.order.update({
      where: { id },
      data: { status: to, ...(action ? { stockCommitted: action === "commit" } : {}) },
    });
    await tx.statusEvent.create({ data: { orderId: id, fromStatus: order.status, toStatus: to, note, userId } });
  });
}
