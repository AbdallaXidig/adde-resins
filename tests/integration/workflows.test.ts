// Runs against a live dev server and the database: `npm run dev`, then `npm run test:integration`.
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3100";
const prisma = new PrismaClient();
const tag = `it-${Date.now()}`;
const email = `${tag}@test.invalid`;
const post = (path: string, body: unknown) =>
  fetch(`${BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json", "X-Forwarded-For": `10.0.0.${Math.floor(Math.random() * 250)}` }, body: JSON.stringify(body) });

afterAll(async () => {
  const customer = await prisma.customer.findUnique({ where: { email } });
  if (customer) {
    await prisma.rfq.deleteMany({ where: { customerId: customer.id } });
    await prisma.order.deleteMany({ where: { customerId: customer.id } });
    await prisma.inquiry.deleteMany({ where: { customerId: customer.id } });
    await prisma.customer.delete({ where: { id: customer.id } });
  }
  await prisma.$disconnect();
});

describe("public workflows persist to PostgreSQL", () => {
  it("creates an RFQ with a unique reference and a timeline entry", async () => {
    const product = await prisma.product.findFirstOrThrow({ where: { status: "PUBLISHED" } });
    const res = await post("/api/rfq", { name: "Test Buyer", email, company: "Test Co", productId: product.id, productName: product.name, grade: "Grade A", quantity: 3, unit: "MT", destinationCountry: "Netherlands", destinationPort: "Rotterdam" });
    expect(res.status).toBe(201);
    const { reference } = await res.json();
    expect(reference).toMatch(/^ADI-RFQ-\d{4}-\d{5}$/);
    const rfq = await prisma.rfq.findUniqueOrThrow({ where: { reference }, include: { statusEvents: true } });
    expect(rfq.productId).toBe(product.id);
    expect(Number(rfq.quantity)).toBe(3);
    expect(rfq.statusEvents[0].toStatus).toBe("PENDING");
  });

  it("gives simultaneous submissions different references", async () => {
    const results = await Promise.all([1, 2, 3].map((n) => post("/api/inquiries", { name: `Parallel ${n}`, email, category: "Samples", message: "Concurrency test" })));
    const refs = await Promise.all(results.map((r) => r.json().then((j) => j.reference)));
    expect(new Set(refs).size).toBe(3);
  });

  it("returns field errors for invalid input and never saves it", async () => {
    const before = await prisma.rfq.count();
    const res = await post("/api/rfq", { name: "", email: "bad", quantity: -1, unit: "MT" });
    expect(res.status).toBe(422);
    const { errors } = await res.json();
    expect(errors).toMatchObject({ name: "required", email: "email", quantity: "positive" });
    expect(await prisma.rfq.count()).toBe(before);
  });

  it("prices orders from the database, not the browser, and rejects unpublished products", async () => {
    const product = await prisma.product.findFirstOrThrow({ where: { status: "PUBLISHED", cartEnabled: true } });
    const res = await post("/api/orders", { name: "Test Buyer", email, shippingCountry: "UAE", shippingPort: "Jebel Ali", type: "ORDER", items: [{ productId: product.id, quantity: 500, unit: "KG", unitPrice: 0.01 }] });
    expect(res.status).toBe(201);
    const order = await prisma.order.findUniqueOrThrow({ where: { reference: (await res.json()).reference }, include: { items: true } });
    const expected = product.priceVisible && product.pricePerKg ? Number(product.pricePerKg) * 500 : null;
    expect(order.items[0].lineTotal === null ? null : Number(order.items[0].lineTotal)).toBe(expected);

    const draft = await prisma.product.findFirst({ where: { status: "DRAFT" } });
    if (draft) {
      const bad = await post("/api/orders", { name: "Test Buyer", email, shippingCountry: "UAE", type: "ORDER", items: [{ productId: draft.id, quantity: 1, unit: "KG" }] });
      expect(bad.status).toBe(409);
    }
  });

  it("opens the quotation document only with its secret link", async () => {
    const product = await prisma.product.findFirstOrThrow({ where: { status: "PUBLISHED", cartEnabled: true } });
    const res = await post("/api/orders", { name: "Quote Buyer", email, shippingCountry: "Oman", type: "QUOTE_REQUEST", items: [{ productId: product.id, quantity: 2, unit: "MT" }] });
    expect(res.status).toBe(201);
    const { reference, token } = await res.json();
    expect(token).toMatch(/^[\w-]{24}$/);
    const doc = await fetch(`${BASE}/quotation/${reference}?k=${token}`);
    expect(doc.status).toBe(200);
    const html = await doc.text();
    expect(html).toContain(reference);
    expect(html).toContain("Oman");
    expect((await fetch(`${BASE}/quotation/${reference}?k=${"x".repeat(24)}`)).status).toBe(404);
    expect((await fetch(`${BASE}/quotation/${reference}`)).status).toBe(404);
  });

  it("keeps admin pages behind sign-in", async () => {
    const res = await fetch(`${BASE}/admin/orders`, { redirect: "manual" });
    expect([302, 307]).toContain(res.status);
    expect(res.headers.get("location")).toContain("/admin/login");
  });
});
