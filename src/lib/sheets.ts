import "server-only";
import { prisma } from "./db";
import { siteUrl } from "./seo";
import { STATUS_LABELS } from "./status";
import { toKg } from "./validation";

/**
 * Copies each quotation, order, RFQ and WhatsApp cart click to an online spreadsheet
 * so the team can track every lead in one place.
 *
 * It posts JSON to SHEET_WEBHOOK_URL: a Google Apps Script web app (see docs/google-sheet.gs)
 * or any service that accepts the same JSON, such as a Power Automate flow writing to Excel Online.
 * It is best effort: the database is the record of truth, and a failed copy can be resent
 * from the admin.
 */

export const SHEET_HEADERS = [
  "Received", "Reference", "Type", "Status", "Name", "Company", "Email", "Phone",
  "Country", "Port", "Items", "Total KG", "Subtotal", "Currency", "Needs pricing",
  "Notes", "Language", "Quotation link", "Admin link",
] as const;
export type SheetRow = Partial<Record<(typeof SHEET_HEADERS)[number], string | number>>;

// HTTPS only, except a local test receiver during development.
export const sheetConfigured = () => /^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)[:/])/.test(process.env.SHEET_WEBHOOK_URL ?? "");

export async function pushToSheet(row: SheetRow): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = process.env.SHEET_WEBHOOK_URL;
  if (!url || !sheetConfigured()) return { ok: false, error: "Sheet not configured" };
  try {
    const res = await fetch(url, {
      method: "POST",
      // text/plain avoids a CORS preflight on Apps Script; the body is still JSON.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ secret: process.env.SHEET_WEBHOOK_SECRET ?? "", headers: SHEET_HEADERS, row }),
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    // Apps Script answers {"ok":true}. Other services may return an empty 2xx, which counts as success.
    if (text.trim().startsWith("{")) {
      const body = JSON.parse(text) as { ok?: boolean; error?: string };
      if (body.ok === false) return { ok: false, error: body.error ?? "Rejected by sheet" };
    } else if (/<html/i.test(text)) {
      // Apps Script shows an HTML sign-in or error page when the web app is not deployed for "Anyone".
      return { ok: false, error: "Sheet returned a web page; check the web app access is set to Anyone" };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 200) : "Request failed" };
  }
}

const iso = (d: Date) => d.toISOString().replace("T", " ").slice(0, 16) + " UTC";
const num = (n: number) => Math.round(n * 1000) / 1000;

export async function syncOrderToSheet(orderId: string) {
  if (!sheetConfigured()) return { ok: false as const, error: "Sheet not configured" };
  const o = await prisma.order.findUnique({ where: { id: orderId }, include: { customer: true, items: true } });
  if (!o) return { ok: false as const, error: "Not found" };
  const base = siteUrl();
  const result = await pushToSheet({
    Received: iso(o.createdAt),
    Reference: o.reference,
    Type: o.type === "ORDER" ? "Cart order" : "Cart quotation",
    Status: STATUS_LABELS[o.status],
    Name: o.customer.name,
    Company: o.customer.company ?? "",
    Email: o.customer.email,
    Phone: o.customer.phone ?? "",
    Country: o.shippingCountry,
    Port: o.shippingPort ?? "",
    Items: o.items.map((i) => `${i.productName}${i.grade ? ` (${i.grade})` : ""}: ${num(Number(i.quantity))} ${i.unit}`).join("; "),
    "Total KG": num(o.items.reduce((s, i) => s + toKg(Number(i.quantity), i.unit), 0)),
    Subtotal: o.subtotal ? Number(o.subtotal) : "",
    Currency: o.currency,
    "Needs pricing": o.hasUnpricedItems ? "Yes" : "No",
    Notes: [o.shippingAddress, o.notes].filter(Boolean).join(" | "),
    Language: o.locale,
    "Quotation link": o.accessToken ? `${base}${o.locale === "en" ? "" : `/${o.locale}`}/quotation/${o.reference}?k=${o.accessToken}` : "",
    "Admin link": `${base}/admin/orders/${o.id}`,
  });
  await prisma.order.update({
    where: { id: o.id },
    data: result.ok ? { sheetSyncedAt: new Date(), sheetError: null } : { sheetError: result.error },
  });
  return result;
}

export async function syncRfqToSheet(rfqId: string) {
  if (!sheetConfigured()) return { ok: false as const, error: "Sheet not configured" };
  const r = await prisma.rfq.findUnique({ where: { id: rfqId }, include: { customer: true } });
  if (!r) return { ok: false as const, error: "Not found" };
  const result = await pushToSheet({
    Received: iso(r.createdAt),
    Reference: r.reference,
    Type: "RFQ form",
    Status: STATUS_LABELS[r.status],
    Name: r.customer.name,
    Company: r.customer.company ?? "",
    Email: r.customer.email,
    Phone: r.customer.phone ?? "",
    Country: r.destinationCountry,
    Port: r.destinationPort,
    Items: `${r.productName}${r.grade ? ` (${r.grade})` : ""}: ${num(Number(r.quantity))} ${r.unit}`,
    "Total KG": num(toKg(Number(r.quantity), r.unit)),
    "Needs pricing": "Yes",
    Notes: [r.packaging && `Packaging: ${r.packaging}`, r.deliveryDate && `Delivery by ${r.deliveryDate.toISOString().slice(0, 10)}`, r.requirements].filter(Boolean).join(" | "),
    Language: r.locale,
    "Admin link": `${siteUrl()}/admin/rfqs/${r.id}`,
  });
  await prisma.rfq.update({
    where: { id: r.id },
    data: result.ok ? { sheetSyncedAt: new Date(), sheetError: null } : { sheetError: result.error },
  });
  return result;
}
