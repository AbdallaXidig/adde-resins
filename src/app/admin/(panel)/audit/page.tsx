import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { Empty, PageHeader, Pager, fmtDateTime, pageNum } from "@/components/admin/ui";

export const metadata = { title: "Activity log" };
const PER = 50;

export default async function Audit({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requirePermission("users");
  const page = pageNum((await searchParams).page);
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: PER, skip: (page - 1) * PER, include: { user: { select: { name: true, email: true } } } }),
    prisma.auditLog.count(),
  ]);
  return (
    <>
      <PageHeader title="Activity log" text="Who changed what in the admin." />
      {rows.length === 0 ? <Empty>No activity yet.</Empty> : (
        <div className="card overflow-x-auto"><table className="admin-table min-w-[640px]">
          <thead><tr><th>When</th><th>User</th><th>Action</th><th>Record</th><th>Details</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}><td className="whitespace-nowrap">{fmtDateTime(r.createdAt)}</td><td>{r.user?.name ?? "—"}</td><td>{r.action}</td><td>{r.entity}</td>
              <td className="max-w-sm truncate font-mono text-xs">{r.meta ? JSON.stringify(r.meta) : ""}</td></tr>
          ))}</tbody>
        </table></div>
      )}
      <Pager page={page} total={total} perPage={PER} params={{}} />
    </>
  );
}
