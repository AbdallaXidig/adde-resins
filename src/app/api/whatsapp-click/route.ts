import { after, NextResponse } from "next/server";
import { z } from "zod";
import { parsePublic } from "@/lib/api";
import { getPublishedProducts } from "@/lib/catalog";
import { pushToSheet, sheetConfigured } from "@/lib/sheets";
import { toKg } from "@/lib/validation";

const text = (max: number) => z.string().trim().max(max).optional().transform((v) => v || "");
const schema = z.object({
  name: text(120),
  company: text(160),
  phone: text(40),
  email: text(200),
  country: text(80),
  locale: z.enum(["en", "so", "ar"]).default("en"),
  items: z.array(z.object({
    productId: z.string().max(40),
    grade: text(80),
    quantity: z.coerce.number().positive().max(1_000_000),
    unit: z.enum(["KG", "MT"]),
  })).min(1).max(50),
  website: z.string().max(0).optional().default(""),
});

/** Logs a "send cart on WhatsApp" click in the tracking sheet. The chat itself happens in WhatsApp. */
export async function POST(req: Request) {
  const parsed = await parsePublic(req, schema, "whatsapp");
  if ("response" in parsed) return parsed.response;
  if (!sheetConfigured()) return NextResponse.json({ ok: true, logged: false });
  const d = parsed.data;
  // Product names come from the catalogue, so the row cannot carry arbitrary text as a product.
  const products = new Map((await getPublishedProducts("en")).map((p) => [p.id, p.name]));
  const items = d.items.filter((i) => products.has(i.productId));
  if (items.length === 0) return NextResponse.json({ ok: true, logged: false });
  after(() => pushToSheet({
    Received: new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC",
    Type: "WhatsApp cart",
    Status: "Sent to WhatsApp",
    Name: d.name, Company: d.company, Email: d.email, Phone: d.phone, Country: d.country,
    Items: items.map((i) => `${products.get(i.productId)}${i.grade ? ` (${i.grade})` : ""}: ${i.quantity} ${i.unit}`).join("; "),
    "Total KG": items.reduce((s, i) => s + toKg(i.quantity, i.unit), 0),
    Language: d.locale,
  }).then((r) => { if (!r.ok) console.error("Sheet log failed", r.error); }));
  return NextResponse.json({ ok: true, logged: true });
}
