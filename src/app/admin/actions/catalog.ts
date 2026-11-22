"use server";
import { revalidateTag } from "next/cache";
import { Prisma, type Availability, type PublishStatus, type QuantityUnit } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit, requirePermission } from "@/lib/auth";
import { deleteImage, saveImage } from "@/lib/upload";
import { bool, done, fail, lines, num, optStr, slugify, str } from "@/lib/admin-helpers";

const AVAIL: Availability[] = ["AVAILABLE", "ON_REQUEST", "OUT_OF_SEASON", "UNAVAILABLE"];
const STATUS: PublishStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];
const refresh = () => revalidateTag("catalog", "max");

function productData(f: FormData, canPrice: boolean) {
  const name = str(f, "name", 160);
  if (!name) fail(f, "Product name is required.");
  const shortDescription = str(f, "shortDescription", 300);
  const description = str(f, "description", 8000);
  if (!shortDescription || !description) fail(f, "Short description and description are required.");
  const availability = str(f, "availability") as Availability;
  const status = str(f, "status") as PublishStatus;
  if (!AVAIL.includes(availability) || !STATUS.includes(status)) fail(f, "Choose a valid status and availability.");
  const categoryId = str(f, "categoryId", 40);
  if (!categoryId) fail(f, "Choose a category.");

  const translations: Record<string, Record<string, string>> = {};
  for (const l of ["so", "ar"]) {
    const t: Record<string, string> = {};
    for (const k of ["name", "shortDescription", "description"]) {
      const v = str(f, `${l}_${k}`, 8000);
      if (v) t[k] = v;
    }
    if (Object.keys(t).length) translations[l] = t;
  }

  const data: Prisma.ProductUncheckedUpdateInput = {
    name, shortDescription, description,
    slug: slugify(str(f, "slug", 80) || name),
    botanicalName: optStr(f, "botanicalName", 160),
    localName: optStr(f, "localName", 80),
    botanicalInfo: optStr(f, "botanicalInfo"),
    origin: optStr(f, "origin", 120),
    grade: optStr(f, "grade", 80),
    gradeOptions: lines(f, "gradeOptions"),
    gradingInfo: optStr(f, "gradingInfo"),
    packagingOptions: lines(f, "packagingOptions"),
    quantityOptions: lines(f, "quantityOptions"),
    moq: num(f, "moq"),
    moqUnit: (str(f, "moqUnit") === "MT" ? "MT" : "KG") as QuantityUnit,
    availability, status, categoryId,
    cartEnabled: bool(f, "cartEnabled"),
    featured: bool(f, "featured"),
    isDemo: bool(f, "isDemo"),
    verified: bool(f, "verified"),
    sortOrder: Math.round(num(f, "sortOrder") ?? 0),
    seoTitle: optStr(f, "seoTitle", 160),
    seoDescription: optStr(f, "seoDescription", 320),
    translations,
  };
  if (canPrice) {
    data.pricePerKg = num(f, "pricePerKg");
    data.currency = (str(f, "currency", 3) || "USD").toUpperCase();
    data.priceVisible = bool(f, "priceVisible");
  }
  return data;
}

function parseSpecs(f: FormData) {
  // One per line: Label | Value | verified
  return lines(f, "specs").map((line, i) => {
    const [label, value, flag] = line.split("|").map((s) => s.trim());
    if (!label || !value) fail(f, `Specification line ${i + 1} needs "Label | Value".`);
    return { label: label.slice(0, 80), value: value.slice(0, 200), verified: /^(verified|yes|true)$/i.test(flag ?? ""), sortOrder: i };
  });
}

async function uploadImages(f: FormData, productId: string, startAt: number, altBase: string) {
  const files = f.getAll("images").filter((x): x is File => x instanceof File && x.size > 0).slice(0, 10);
  for (const [i, file] of files.entries()) {
    let url: string;
    try { url = await saveImage(file); } catch (e) { fail(f, (e as Error).message); }
    await prisma.productImage.create({ data: { productId, url, alt: altBase, sortOrder: startAt + i, isPlaceholder: false } });
  }
}

function uniqueError(e: unknown, f: FormData): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") fail(f, "Another product already uses that URL slug.");
  throw e;
}

export async function createProduct(f: FormData) {
  const user = await requirePermission("products");
  const data = productData(f, user.role === "SUPER_ADMIN" || user.role === "MANAGER") as Prisma.ProductUncheckedCreateInput;
  let id = "";
  try {
    const p = await prisma.product.create({ data: { ...data, specs: { create: parseSpecs(f) } } });
    id = p.id;
  } catch (e) { uniqueError(e, f); }
  await uploadImages(f, id, 0, String(data.name));
  await audit(user.id, "create", "Product", id, { name: data.name });
  refresh();
  done(`/admin/products/${id}`, "Product created");
}

export async function updateProduct(f: FormData) {
  const user = await requirePermission("products");
  const id = str(f, "id", 40);
  const data = productData(f, user.role === "SUPER_ADMIN" || user.role === "MANAGER");
  const specs = parseSpecs(f);
  try {
    await prisma.$transaction([
      prisma.product.update({ where: { id }, data }),
      prisma.productSpec.deleteMany({ where: { productId: id } }),
      prisma.productSpec.createMany({ data: specs.map((s) => ({ ...s, productId: id })) }),
    ]);
  } catch (e) { uniqueError(e, f); }

  // Existing images: alt text, order, placeholder flag, removal.
  const images = await prisma.productImage.findMany({ where: { productId: id } });
  for (const img of images) {
    if (bool(f, `img_remove_${img.id}`)) { await prisma.productImage.delete({ where: { id: img.id } }); await deleteImage(img.url); continue; }
    await prisma.productImage.update({
      where: { id: img.id },
      data: { alt: str(f, `img_alt_${img.id}`, 200) || img.alt, sortOrder: Math.round(num(f, `img_order_${img.id}`) ?? img.sortOrder), isPlaceholder: bool(f, `img_placeholder_${img.id}`) },
    });
  }
  await uploadImages(f, id, images.length, String(data.name));
  await audit(user.id, "update", "Product", id, { name: data.name });
  refresh();
  done(`/admin/products/${id}`, "Product saved");
}

export async function deleteProduct(f: FormData) {
  const user = await requirePermission("products");
  const id = str(f, "id", 40);
  const used = await prisma.product.findUnique({ where: { id }, include: { _count: { select: { orderItems: true, rfqs: true } } } });
  if (!used) fail(f, "Product not found.", "/admin/products");
  // Products with order or RFQ history are archived, never deleted, so records stay complete.
  if (used._count.orderItems || used._count.rfqs) {
    await prisma.product.update({ where: { id }, data: { status: "ARCHIVED" } });
    await audit(user.id, "archive", "Product", id);
    refresh();
    done("/admin/products", "Product has order history, so it was archived instead of deleted");
  }
  await prisma.product.delete({ where: { id } });
  await audit(user.id, "delete", "Product", id, { name: used.name });
  refresh();
  done("/admin/products", "Product deleted");
}

export async function saveCategory(f: FormData) {
  const user = await requirePermission("categories");
  const id = str(f, "id", 40);
  const name = str(f, "name", 80);
  if (!name) fail(f, "Category name is required.", "/admin/categories");
  const data = {
    name, slug: slugify(str(f, "slug", 80) || name), description: optStr(f, "description", 500),
    sortOrder: Math.round(num(f, "sortOrder") ?? 0),
    translations: { so: { name: str(f, "so_name", 80) || undefined }, ar: { name: str(f, "ar_name", 80) || undefined } },
  };
  try {
    if (id) await prisma.category.update({ where: { id }, data });
    else await prisma.category.create({ data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") fail(f, "That slug is already used.", "/admin/categories");
    throw e;
  }
  await audit(user.id, id ? "update" : "create", "Category", id || undefined, { name });
  refresh();
  done("/admin/categories", "Category saved");
}

export async function deleteCategory(f: FormData) {
  const user = await requirePermission("categories");
  const id = str(f, "id", 40);
  const count = await prisma.product.count({ where: { categoryId: id } });
  if (count) fail(f, "Move or delete this category's products first.", "/admin/categories");
  await prisma.category.delete({ where: { id } });
  await audit(user.id, "delete", "Category", id);
  refresh();
  done("/admin/categories", "Category deleted");
}

export async function updateInventory(f: FormData) {
  const user = await requirePermission("inventory");
  const id = str(f, "id", 40);
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) fail(f, "Product not found.", "/admin/inventory");
  const availability = str(f, "availability") as Availability;
  if (!AVAIL.includes(availability)) fail(f, "Invalid availability.", "/admin/inventory");
  const tracked = bool(f, "tracked");
  const stockKg = tracked ? (num(f, "stockKg") ?? 0) : null;
  const data: Prisma.ProductUpdateInput = { availability, stockKg };
  if (user.role === "SUPER_ADMIN" || user.role === "MANAGER") {
    data.pricePerKg = num(f, "pricePerKg");
    data.priceVisible = bool(f, "priceVisible") && num(f, "pricePerKg") !== null;
  }
  await prisma.$transaction(async (tx) => {
    await tx.product.update({ where: { id }, data });
    const before = product.stockKg === null ? null : Number(product.stockKg);
    if (stockKg !== null && before !== stockKg) {
      await tx.stockMovement.create({ data: { productId: id, changeKg: stockKg - (before ?? 0), reason: optStr(f, "reason", 200) ?? "Manual adjustment" } });
    }
  });
  await audit(user.id, "inventory", "Product", id, { availability, stockKg, price: data.pricePerKg ?? undefined });
  refresh();
  done("/admin/inventory", `${product.name} updated`);
}
