import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { can, PERMISSIONS, ROLE_LABELS, ROLE_SUMMARY } from "@/lib/permissions";
import { createUser, updateUser } from "../../actions/users";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { PageHeader, Panel, fmtDate } from "@/components/admin/ui";
import type { Role } from "@prisma/client";

export const metadata = { title: "Users & roles" };
const ROLES = Object.keys(ROLE_LABELS) as Role[];

export default async function Users({ searchParams }: { searchParams: FlashParams }) {
  const me = await requirePermission("users");
  const sp = await searchParams;
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title="Users & roles" text="Changing a role, deactivating a user or resetting a password signs that user out immediately." />
      <div className="space-y-3">
        {users.map((u) => (
          <form key={u.id} action={updateUser} className="card grid items-end gap-3 p-4 md:grid-cols-[1.5fr_1fr_1.2fr_auto_auto]">
            <input type="hidden" name="id" value={u.id} />
            <div><p className="font-semibold">{u.name}{u.id === me.id && <span className="chip ms-2">you</span>}</p><p className="text-sm text-muted">{u.email}</p><p className="text-xs text-muted">Last sign-in {fmtDate(u.lastLoginAt)}</p></div>
            <label className="text-sm"><span className="field-label">Role</span><select name="role" defaultValue={u.role} className="field">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></label>
            <label className="text-sm"><span className="field-label">New password</span><input name="password" type="password" minLength={8} autoComplete="new-password" placeholder="Leave empty to keep" className="field" /></label>
            <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={u.active} /> Active</label>
            <button type="submit" className="btn btn-primary">Save</button>
          </form>
        ))}
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Panel title="Add user">
          <form action={createUser} className="grid gap-3 sm:grid-cols-2">
            <input name="name" required placeholder="Full name" aria-label="Full name" className="field" />
            <input name="email" type="email" required placeholder="Email" aria-label="Email" className="field" />
            <select name="role" defaultValue="SALES" aria-label="Role" className="field">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>
            <input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="Temporary password (8+)" aria-label="Temporary password" className="field" />
            <button type="submit" className="btn btn-primary sm:col-span-2">Create user</button>
          </form>
        </Panel>
        <Panel title="What each role can do">
          <div className="overflow-x-auto"><table className="admin-table text-xs">
            <thead><tr><th>Area</th>{ROLES.map((r) => <th key={r}>{ROLE_LABELS[r]}</th>)}</tr></thead>
            <tbody>{PERMISSIONS.map((p) => <tr key={p}><td className="capitalize">{p}</td>{ROLES.map((r) => <td key={r}>{can(r, p) ? "✓" : ""}</td>)}</tr>)}</tbody>
          </table></div>
          <ul className="mt-4 space-y-1.5 text-sm">{ROLES.map((r) => <li key={r}><strong>{ROLE_LABELS[r]}:</strong> <span className="text-muted">{ROLE_SUMMARY[r]}</span></li>)}</ul>
        </Panel>
      </div>
    </>
  );
}
