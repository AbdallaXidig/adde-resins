import type { PublicProduct } from "@/lib/catalog";

export function formatMoq(p: Pick<PublicProduct, "moq" | "moqUnit">) {
  return p.moq ? `${p.moq.toLocaleString("en")} ${p.moqUnit}` : null;
}

export function formatPrice(p: Pick<PublicProduct, "price" | "currency">) {
  if (p.price === null) return null;
  return `${new Intl.NumberFormat("en", { style: "currency", currency: p.currency }).format(p.price)} / kg`;
}
