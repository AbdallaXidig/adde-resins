import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { Empty, Panel, PageHeader, StatusBadge, fmtDate, fmtQty } from "@/components/admin/ui";

export const metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: FlashParams }) {
  const sp = await searchParams;
  const user = await requirePermission("dashboard");
  const since = new Date(Date.now() - 30 * 86400_000);
  const [pendingRfqs, pendingOrders, newInquiries, rfq30, order30, published, drafts, demo, recentRfqs, recentOrders, recentInquiries] = await Promise.all([
    prisma.rfq.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.inquiry.count({ where: { status: "NEW" } }),
    prisma.rfq.count({ where: { createdAt: { gte: since } } }),
    prisma.order.count({ where: { createdAt: { gte: since } } }),
    prisma.product.count({ where: { status: "PUBLISHED" } }),
    prisma.product.count({ where: { status: "DRAFT" } }),
    prisma.product.count({ where: { status: "PUBLISHED", isDemo: true } }),
    prisma.rfq.findMany({ take: 6, orderBy: { createdAt: "desc" }, include: { customer: true } }),
    prisma.order.findMany({ take: 6, orderBy: { createdAt: "desc" }, include: { customer: true } }),
    prisma.inquiry.findMany({ take: 6, orderBy: { createdAt: "desc" } }),
  ]);
  const tiles = [
    { label: "Pending quotation requests", value: pendingRfqs, href: "/admin/rfqs?status=PENDING", show: can(user.role, "rfqs") },
    { label: "Pending orders", value: pendingOrders, href: "/admin/orders?status=PENDING", show: can(user.role, "orders") },
    { label: "New inquiries", value: newInquiries, href: "/admin/inquiries?status=NEW", show: can(user.role, "inquiries") },
    { label: "RFQs + orders, last 30 days", value: rfq30 + order30, href: "/admin/reports", show: can(user.role, "reports") },
    { label: "Published products", value: published, href: "/admin/products", show: can(user.role, "products") },
  ].filter((t) => t.show);

  return (
    <>
      <Flash saved={sp.saved} error={sp.denied ? "Your role does not have access to that section." : sp.error} />
      <PageHeader title={`Welcome, ${user.name}`} text="Today's work at a glance." />
      {demo > 0 && can(user.role, "products") && (
        <p className="mb-6 rounded-lg border border-[#f3c9a8] bg-[#fdf1e7] px-4 py-3 text-sm text-[#7a3407]">
          {demo} published product{demo === 1 ? " is" : "s are"} still sample data. Replace the details with verified information, then untick “Sample data” on each product. {drafts > 0 && `${drafts} draft product${drafts === 1 ? " is" : "s are"} hidden from the website.`}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="card p-5 transition-shadow hover:shadow-lift">
            <p className="font-serif text-4xl font-semibold text-brown">{t.value}</p>
            <p className="mt-1 text-sm text-muted">{t.label}</p>
          </Link>
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {can(user.role, "rfqs") && (
          <Panel title="Latest quotation requests" action={<Link href="/admin/rfqs" className="text-sm font-semibold text-orange-dark">All <ArrowRight size={14} className="inline" aria-hidden /></Link>}>
            {recentRfqs.length === 0 ? <Empty>No quotation requests yet.</Empty> : (
              <ul className="divide-y divide-line">
                {recentRfqs.map((r) => (
                  <li key={r.id}><Link href={`/admin/rfqs/${r.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-orange-dark">
                    <span className="min-w-0"><span className="block font-mono text-xs text-muted">{r.reference}</span><span className="block truncate text-sm font-medium">{r.productName} · {fmtQty(r.quantity.toString(), r.unit)}</span><span className="block truncate text-xs text-muted">{r.customer.company ?? r.customer.name} · {fmtDate(r.createdAt)}</span></span>
                    <StatusBadge status={r.status} />
                  </Link></li>
                ))}
              </ul>
            )}
          </Panel>
        )}
        {can(user.role, "orders") && (
          <Panel title="Latest orders" action={<Link href="/admin/orders" className="text-sm font-semibold text-orange-dark">All <ArrowRight size={14} className="inline" aria-hidden /></Link>}>
            {recentOrders.length === 0 ? <Empty>No orders yet.</Empty> : (
              <ul className="divide-y divide-line">
                {recentOrders.map((o) => (
                  <li key={o.id}><Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-orange-dark">
                    <span className="min-w-0"><span className="block font-mono text-xs text-muted">{o.reference}</span><span className="block truncate text-sm font-medium">{o.customer.company ?? o.customer.name}</span><span className="block text-xs text-muted">{o.type === "ORDER" ? "Order" : "Cart quotation"} · {fmtDate(o.createdAt)}</span></span>
                    <StatusBadge status={o.status} />
                  </Link></li>
                ))}
              </ul>
            )}
          </Panel>
        )}
        {can(user.role, "inquiries") && (
          <Panel title="Latest inquiries" action={<Link href="/admin/inquiries" className="text-sm font-semibold text-orange-dark">All <ArrowRight size={14} className="inline" aria-hidden /></Link>}>
            {recentInquiries.length === 0 ? <Empty>No inquiries yet.</Empty> : (
              <ul className="divide-y divide-line">
                {recentInquiries.map((q) => (
                  <li key={q.id}><Link href={`/admin/inquiries/${q.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-orange-dark">
                    <span className="min-w-0"><span className="block truncate text-sm font-medium">{q.name} · {q.category}</span><span className="block truncate text-xs text-muted">{q.message}</span></span>
                    <StatusBadge status={q.status} />
                  </Link></li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </div>
    </>
  );
}
