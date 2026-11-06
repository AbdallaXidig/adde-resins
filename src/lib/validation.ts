import { z } from "zod";

const trimmed = (max: number) => z.string().trim().max(max);
const required = (max: number) => trimmed(max).min(1, "required");
const optional = (max: number) =>
  trimmed(max).optional().transform((v) => (v ? v : undefined));

const contact = {
  name: required(120),
  email: z.string().trim().toLowerCase().email("email").max(200),
  phone: trimmed(40).regex(/^[+()\d\s-]*$/, "phone").optional().transform((v) => (v ? v : undefined)),
  company: optional(160),
  // Honeypot: hidden from people, filled by naive bots.
  website: z.string().max(0, "spam").optional().default(""),
};

export const quantityUnit = z.enum(["KG", "MT"]);

export const rfqSchema = z.object({
  ...contact,
  company: required(160),
  productId: optional(40),
  productName: required(160),
  grade: optional(80),
  packaging: optional(120),
  quantity: z.coerce.number().positive("positive").max(1_000_000, "tooLarge"),
  unit: quantityUnit,
  destinationCountry: required(80),
  destinationPort: required(120),
  deliveryDate: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "date")
    .refine((v) => !v || new Date(v) >= new Date(new Date().toDateString()), "pastDate"),
  requirements: optional(4000),
  locale: z.enum(["en", "so", "ar"]).default("en"),
});
export type RfqInput = z.infer<typeof rfqSchema>;

export const inquirySchema = z.object({
  ...contact,
  country: optional(80),
  category: required(60),
  subject: optional(160),
  message: required(4000),
  locale: z.enum(["en", "so", "ar"]).default("en"),
});
export type InquiryInput = z.infer<typeof inquirySchema>;

export const orderSchema = z.object({
  ...contact,
  country: optional(80),
  shippingCountry: required(80),
  shippingPort: optional(120),
  shippingAddress: optional(500),
  notes: optional(4000),
  type: z.enum(["ORDER", "QUOTE_REQUEST"]),
  items: z
    .array(
      z.object({
        productId: required(40),
        grade: optional(80),
        packaging: optional(120),
        quantity: z.coerce.number().positive("positive").max(1_000_000, "tooLarge"),
        unit: quantityUnit,
      }),
    )
    .min(1, "emptyCart")
    .max(50),
  locale: z.enum(["en", "so", "ar"]).default("en"),
});
export type OrderInput = z.infer<typeof orderSchema>;

/** Flattens Zod issues into { field: code } for the forms to translate. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message.length < 24 && /^[a-zA-Z]+$/.test(issue.message) ? issue.message : "invalid";
  }
  return out;
}

export const toKg = (quantity: number, unit: "KG" | "MT") => (unit === "MT" ? quantity * 1000 : quantity);
