"use server";
import type { QuantityUnit, VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit, requirePermission } from "@/lib/auth";
import { done, fail, num, optStr, str } from "@/lib/admin-helpers";

const BACK = "/admin/research";

export async function saveSupplier(f: FormData) {
  const user = await requirePermission("research");
  const id = str(f, "id", 40);
  const name = str(f, "name", 160);
  if (!name) fail(null, "Supplier name is required.", BACK);
  const website = optStr(f, "website", 300);
  if (website && !/^https?:\/\//.test(website)) fail(null, "Website must start with http:// or https://", BACK);
  const data = { name, country: optStr(f, "country", 80), contact: optStr(f, "contact", 120), email: optStr(f, "email", 200), phone: optStr(f, "phone", 40), website, notes: optStr(f, "notes"), active: f.get("active") !== "off" };
  const row = id ? await prisma.supplier.update({ where: { id }, data }) : await prisma.supplier.create({ data });
  await audit(user.id, id ? "update" : "create", "Supplier", row.id, { name });
  done(BACK, "Supplier saved");
}

export async function saveResearch(f: FormData) {
  const user = await requirePermission("research");
  const id = str(f, "id", 40);
  const title = str(f, "title", 200);
  if (!title) fail(null, "Title is required.", BACK);
  const sourceUrl = optStr(f, "sourceUrl", 500);
  if (sourceUrl && !/^https?:\/\//.test(sourceUrl)) fail(null, "Source URL must start with http:// or https://", BACK);
  const status = (str(f, "status") || "UNVERIFIED") as VerificationStatus;
  const data = {
    title, sourceUrl, status,
    productId: optStr(f, "productId", 40), supplierId: optStr(f, "supplierId", 40),
    botanicalName: optStr(f, "botanicalName", 160), grade: optStr(f, "grade", 80), specNotes: optStr(f, "specNotes"),
    purchaseCost: num(f, "purchaseCost"), costCurrency: (str(f, "costCurrency", 3) || "USD").toUpperCase(),
    costUnit: (str(f, "costUnit") === "MT" ? "MT" : "KG") as QuantityUnit,
    ...(status === "VERIFIED" ? { verifiedBy: user.name, verifiedAt: new Date() } : { verifiedBy: null, verifiedAt: null }),
  };
  const row = id ? await prisma.researchEntry.update({ where: { id }, data }) : await prisma.researchEntry.create({ data });
  await audit(user.id, id ? "update" : "create", "ResearchEntry", row.id, { title, status });
  done(BACK, "Research entry saved");
}
