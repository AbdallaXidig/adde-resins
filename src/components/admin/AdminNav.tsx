"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, BookOpen, CircleDollarSign, ClipboardList, Factory, FileText, Gauge, History, Landmark, Menu, MessageSquare, Package, Receipt, Settings, ShoppingBag, Tags, Truck, Users, UserCog, Wallet, Warehouse, X } from "lucide-react";
import type { Permission } from "@/lib/permissions";

type Item = { href: string; label: string; perm: Permission; Icon: typeof Gauge; badge?: "rfqs" | "orders" | "inquiries" | "overdue"; group: string };
const ITEMS: Item[] = [
  { href: "/admin", label: "Dashboard", perm: "dashboard", Icon: Gauge, group: "" },
  { href: "/admin/rfqs", label: "Quotation requests", perm: "rfqs", Icon: ClipboardList, badge: "rfqs", group: "Website requests" },
  { href: "/admin/orders", label: "Website orders", perm: "orders", Icon: ShoppingBag, badge: "orders", group: "Website requests" },
  { href: "/admin/inquiries", label: "Inquiries", perm: "inquiries", Icon: MessageSquare, badge: "inquiries", group: "Website requests" },
  { href: "/admin/sales", label: "Quotations & invoices", perm: "sales", Icon: Receipt, badge: "overdue", group: "Sales" },
  { href: "/admin/customers", label: "Customers", perm: "customers", Icon: Users, group: "Sales" },
  { href: "/admin/purchases", label: "Purchases", perm: "purchases", Icon: Truck, group: "Buying" },
  { href: "/admin/suppliers", label: "Suppliers", perm: "purchases", Icon: Factory, group: "Buying" },
  { href: "/admin/accounting", label: "Accounting", perm: "accounting", Icon: Landmark, group: "Money" },
  { href: "/admin/accounting/payments", label: "Payments", perm: "accounting", Icon: Wallet, group: "Money" },
  { href: "/admin/accounting/expenses", label: "Expenses", perm: "accounting", Icon: CircleDollarSign, group: "Money" },
  { href: "/admin/products", label: "Products", perm: "products", Icon: Package, group: "Catalogue" },
  { href: "/admin/categories", label: "Categories", perm: "categories", Icon: Tags, group: "Catalogue" },
  { href: "/admin/inventory", label: "Inventory & pricing", perm: "inventory", Icon: Warehouse, group: "Catalogue" },
  { href: "/admin/research", label: "Product research", perm: "research", Icon: BookOpen, group: "Catalogue" },
  { href: "/admin/content", label: "Website content", perm: "content", Icon: FileText, group: "Website" },
  { href: "/admin/reports", label: "Website reports", perm: "reports", Icon: BarChart3, group: "Website" },
  { href: "/admin/users", label: "Users & roles", perm: "users", Icon: UserCog, group: "Admin" },
  { href: "/admin/settings", label: "Settings", perm: "settings", Icon: Settings, group: "Admin" },
  { href: "/admin/audit", label: "Activity log", perm: "users", Icon: History, group: "Admin" },
];

export function AdminNav({ allowed, counts }: { allowed: Permission[]; counts: Record<string, number> }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = ITEMS.filter((i) => allowed.includes(i.perm));
  // Longest matching link wins, so /admin/accounting/payments doesn't also light up Accounting.
  const activeHref = items.map((i) => i.href).filter((h) => (h === "/admin" ? pathname === "/admin" : pathname === h || pathname.startsWith(`${h}/`))).sort((a, b) => b.length - a.length)[0];
  const groups = [...new Set(items.map((i) => i.group))];
  const nav = (
    <nav aria-label="Admin" className="space-y-3">
      {groups.map((g) => (
        <div key={g || "top"}>
          {g && <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-white/45">{g}</p>}
          <div className="space-y-0.5">
            {items.filter((i) => i.group === g).map(({ href, label, Icon, badge }) => {
              const active = href === activeHref;
              return (
                <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-1.5 text-[15px] transition-colors ${active ? "bg-white/12 font-semibold text-white" : "text-white/75 hover:bg-white/8 hover:text-white"}`}>
                  <Icon size={18} aria-hidden />{label}
                  {badge && counts[badge] > 0 && <span className={`ms-auto rounded-full px-2 text-xs font-bold text-white ${badge === "overdue" ? "bg-burgundy" : "bg-orange-dark"}`} title={badge === "overdue" ? "Overdue invoices" : undefined}>{counts[badge]}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
  return (
    <>
      <button type="button" className="grid size-11 place-items-center rounded-lg text-white lg:hidden" aria-label="Open admin menu" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={22} aria-hidden /></button>
      <div className="hidden lg:block lg:w-full">{nav}</div>
      {open && (
        <div className="fixed inset-0 z-50 bg-charcoal/50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="h-full w-72 overflow-y-auto bg-brown p-4" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="mb-3 grid size-11 place-items-center rounded-lg text-white" aria-label="Close admin menu" onClick={() => setOpen(false)}><X size={22} aria-hidden /></button>
            {nav}
          </div>
        </div>
      )}
    </>
  );
}
