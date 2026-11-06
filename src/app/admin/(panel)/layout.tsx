import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { can, PERMISSIONS, ROLE_LABELS } from "@/lib/permissions";
import { logoutAction } from "../actions/auth";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  const allowed = PERMISSIONS.filter((p) => can(user.role, p));
  const [rfqs, orders, inquiries, overdue] = await Promise.all([
    prisma.rfq.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.inquiry.count({ where: { status: "NEW" } }),
    prisma.salesDocument.count({ where: { kind: "INVOICE", status: { in: ["ISSUED", "PARTIALLY_PAID"] }, dueDate: { lt: new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z") } } }),
  ]);
  return (
    <div className="lg:grid lg:min-h-screen lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 z-30 flex items-center justify-between bg-brown px-3 py-2 lg:h-screen lg:flex-col lg:items-stretch lg:justify-start lg:overflow-y-auto lg:p-4">
        <Link href="/admin" className="font-serif text-lg text-white lg:mb-6 lg:px-3 lg:pt-2">Adde International<span className="block text-xs font-sans text-white/60">Administration</span></Link>
        <div className="flex items-center gap-1 lg:block">
          <form action={logoutAction} className="lg:hidden"><button type="submit" className="grid size-11 place-items-center rounded-lg text-white" aria-label="Sign out"><LogOut size={20} aria-hidden /></button></form>
          <AdminNav allowed={allowed} counts={{ rfqs, orders, inquiries, overdue }} />
        </div>
        <div className="hidden lg:mt-auto lg:block lg:border-t lg:border-white/15 lg:pt-4">
          <p className="px-3 text-sm text-white">{user.name}</p>
          <p className="px-3 text-xs text-white/60">{ROLE_LABELS[user.role]}</p>
          <a href="/" target="_blank" className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/8 hover:text-white"><ExternalLink size={16} aria-hidden />View website</a>
          <form action={logoutAction}><button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/8 hover:text-white"><LogOut size={16} aria-hidden />Sign out</button></form>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
    </div>
  );
}
