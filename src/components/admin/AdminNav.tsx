"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, BookOpen, ClipboardList, FileText, Gauge, History, Menu, MessageSquare, Package, Settings, ShoppingBag, Tags, Users, UserCog, Warehouse, X } from "lucide-react";
import type { Permission } from "@/lib/permissions";

const ITEMS: { href: string; label: string; perm: Permission; Icon: typeof Gauge; badge?: "rfqs" | "orders" | "inquiries" }[] = [
  { href: "/admin", label: "Dashboard", perm: "dashboard", Icon: Gauge },
  { href: "/admin/rfqs", label: "Quotation requests", perm: "rfqs", Icon: ClipboardList, badge: "rfqs" },
  { href: "/admin/orders", label: "Orders", perm: "orders", Icon: ShoppingBag, badge: "orders" },
  { href: "/admin/inquiries", label: "Inquiries", perm: "inquiries", Icon: MessageSquare, badge: "inquiries" },
  { href: "/admin/customers", label: "Customers", perm: "customers", Icon: Users },
  { href: "/admin/products", label: "Products", perm: "products", Icon: Package },
  { href: "/admin/categories", label: "Categories", perm: "categories", Icon: Tags },
  { href: "/admin/inventory", label: "Inventory & pricing", perm: "inventory", Icon: Warehouse },
  { href: "/admin/research", label: "Product research", perm: "research", Icon: BookOpen },
  { href: "/admin/reports", label: "Reports", perm: "reports", Icon: BarChart3 },
  { href: "/admin/content", label: "Website content", perm: "content", Icon: FileText },
  { href: "/admin/users", label: "Users & roles", perm: "users", Icon: UserCog },
  { href: "/admin/settings", label: "Settings", perm: "settings", Icon: Settings },
  { href: "/admin/audit", label: "Activity log", perm: "users", Icon: History },
];

export function AdminNav({ allowed, counts }: { allowed: Permission[]; counts: Record<string, number> }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = ITEMS.filter((i) => allowed.includes(i.perm));
  const nav = (
    <nav aria-label="Admin" className="space-y-0.5">
      {items.map(({ href, label, Icon, badge }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] transition-colors ${active ? "bg-white/12 font-semibold text-white" : "text-white/75 hover:bg-white/8 hover:text-white"}`}>
            <Icon size={18} aria-hidden />{label}
            {badge && counts[badge] > 0 && <span className="ms-auto rounded-full bg-orange-dark px-2 text-xs font-bold text-white">{counts[badge]}</span>}
          </Link>
        );
      })}
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
