import { describe, expect, it } from "vitest";
import { fieldErrors, inquirySchema, orderSchema, rfqSchema, toKg } from "@/lib/validation";
import { formatReference } from "@/lib/references";
import { stockAction } from "@/lib/status";
import { deepMerge, setByPath } from "@/lib/objects";
import { can } from "@/lib/permissions";

const rfq = {
  name: "Amina Yusuf", email: "BUYER@Example.com", company: "Example Trading", productName: "Myrrh",
  quantity: "2.5", unit: "MT", destinationCountry: "Germany", destinationPort: "Hamburg",
};

describe("RFQ validation", () => {
  it("accepts a valid request and normalises fields", () => {
    const r = rfqSchema.parse(rfq);
    expect(r.email).toBe("buyer@example.com");
    expect(r.quantity).toBe(2.5);
    expect(r.locale).toBe("en");
  });
  it("rejects missing destination, zero quantity, bad email and past dates", () => {
    const r = rfqSchema.safeParse({ ...rfq, destinationPort: "", quantity: 0, email: "nope", deliveryDate: "2020-01-01" });
    expect(r.success).toBe(false);
    const errs = fieldErrors(r.error!);
    expect(errs).toMatchObject({ destinationPort: "required", quantity: "positive", email: "email", deliveryDate: "pastDate" });
  });
  it("rejects an unknown unit and a filled honeypot", () => {
    expect(rfqSchema.safeParse({ ...rfq, unit: "LB" }).success).toBe(false);
    expect(fieldErrors(rfqSchema.safeParse({ ...rfq, website: "spam.example" }).error!).website).toBe("spam");
  });
});

describe("Other schemas", () => {
  it("requires message and category for inquiries", () => {
    expect(inquirySchema.safeParse({ name: "A", email: "a@b.co", category: "", message: "" }).success).toBe(false);
  });
  it("requires at least one cart item", () => {
    const r = orderSchema.safeParse({ name: "A", email: "a@b.co", shippingCountry: "UAE", type: "ORDER", items: [] });
    expect(fieldErrors(r.error!).items).toBe("emptyCart");
  });
});

describe("Business rules", () => {
  it("formats references", () => expect(formatReference("RFQ", 2026, 42)).toBe("ADI-RFQ-2026-00042"));
  it("converts metric tons", () => expect(toKg(1.5, "MT")).toBe(1500));
  it("commits stock on confirmation and releases on cancellation", () => {
    expect(stockAction("CONFIRMED", false)).toBe("commit");
    expect(stockAction("SHIPPED", true)).toBeNull();
    expect(stockAction("CANCELLED", true)).toBe("release");
    expect(stockAction("CANCELLED", false)).toBeNull();
  });
  it("enforces role permissions", () => {
    expect(can("SALES", "orders")).toBe(true);
    expect(can("SALES", "products")).toBe(false);
    expect(can("CONTENT", "orders")).toBe(false);
    expect(can("MANAGER", "users")).toBe(false);
    expect(can("SUPER_ADMIN", "users")).toBe(true);
  });
  it("merges translations with English fallback and blocks prototype keys", () => {
    const merged = deepMerge({ a: { b: "en", c: "en" } }, { a: { b: "so" } });
    expect(merged).toEqual({ a: { b: "so", c: "en" } });
    const target: Record<string, unknown> = {};
    setByPath(target, "__proto__.polluted", "x");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
