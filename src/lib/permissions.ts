import type { Role } from "@prisma/client";

export const PERMISSIONS = [
  "dashboard", "products", "categories", "inventory", "pricing", "customers", "orders",
  "rfqs", "inquiries", "sales", "purchases", "accounting", "content", "reports", "research",
  "users", "settings",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: PERMISSIONS,
  MANAGER: ["dashboard", "products", "categories", "inventory", "pricing", "customers", "orders", "rfqs", "inquiries", "sales", "purchases", "accounting", "content", "reports", "research"],
  SALES: ["dashboard", "customers", "orders", "rfqs", "inquiries", "sales"],
  CONTENT: ["dashboard", "products", "categories", "content"],
  ACCOUNTANT: ["dashboard", "customers", "sales", "purchases", "accounting", "reports"],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super admin",
  MANAGER: "Manager",
  SALES: "Sales",
  CONTENT: "Content editor",
  ACCOUNTANT: "Accountant",
};

/** Plain-language summary shown on the Users page. */
export const ROLE_SUMMARY: Record<Role, string> = {
  SUPER_ADMIN: "Everything, including users, settings and the activity log.",
  MANAGER: "Catalogue, pricing, stock, website requests, sales, purchases, accounting, website text and reports.",
  SALES: "Website requests, customers, and quotations and invoices. Cannot record payments.",
  CONTENT: "Products, categories and website text. No prices or finance.",
  ACCOUNTANT: "Customers, quotations and invoices, purchases, payments, expenses, accounts and reports.",
};
