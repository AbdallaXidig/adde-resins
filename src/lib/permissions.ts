import type { Role } from "@prisma/client";

export const PERMISSIONS = [
  "dashboard", "products", "categories", "inventory", "pricing", "customers", "orders",
  "rfqs", "inquiries", "content", "reports", "research", "users", "settings",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: PERMISSIONS,
  MANAGER: ["dashboard", "products", "categories", "inventory", "pricing", "customers", "orders", "rfqs", "inquiries", "content", "reports", "research"],
  SALES: ["dashboard", "customers", "orders", "rfqs", "inquiries"],
  CONTENT: ["dashboard", "products", "categories", "content"],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super admin",
  MANAGER: "Manager",
  SALES: "Sales",
  CONTENT: "Content editor",
};
