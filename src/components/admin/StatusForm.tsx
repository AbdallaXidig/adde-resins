import { STATUS_LABELS, WORKFLOW_STATUSES } from "@/lib/status";
import type { WorkflowStatus } from "@prisma/client";

export function StatusForm({ id, status, adminNotes, action, hint }: { id: string; status: WorkflowStatus; adminNotes: string | null; action: (f: FormData) => Promise<void>; hint?: string }) {
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <div><label htmlFor="status" className="field-label">Status</label>
        <select id="status" name="status" defaultValue={status} className="field">{WORKFLOW_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select>
        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}</div>
      <div><label htmlFor="note" className="field-label">Note for the timeline</label><input id="note" name="note" maxLength={1000} className="field" placeholder="e.g. Quotation emailed, valid 14 days" /></div>
      <div><label htmlFor="adminNotes" className="field-label">Internal notes</label><textarea id="adminNotes" name="adminNotes" rows={4} defaultValue={adminNotes ?? ""} className="field" /></div>
      <button type="submit" className="btn btn-primary w-full">Update</button>
    </form>
  );
}

export function Timeline({ events }: { events: { id: string; fromStatus: WorkflowStatus | null; toStatus: WorkflowStatus; note: string | null; createdAt: Date; user: { name: string } | null }[] }) {
  return (
    <ol className="space-y-3 border-s-2 border-line ps-4">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -start-[1.4rem] top-1.5 size-2.5 rounded-full bg-orange" aria-hidden />
          <p className="text-sm font-semibold text-brown">{STATUS_LABELS[e.toStatus]}{e.fromStatus && e.fromStatus !== e.toStatus && <span className="font-normal text-muted"> from {STATUS_LABELS[e.fromStatus]}</span>}</p>
          {e.note && <p className="text-sm">{e.note}</p>}
          <p className="text-xs text-muted">{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(e.createdAt)}{e.user ? ` · ${e.user.name}` : " · website"}</p>
        </li>
      ))}
    </ol>
  );
}

export function ContactLinks({ email, phone, reference, whatsapp }: { email: string | null; phone: string | null; reference: string; whatsapp?: boolean }) {
  const digits = phone?.replace(/\D/g, "");
  return (
    <div className="flex flex-wrap gap-2">
      {email && <a className="btn btn-outline min-h-9 py-1.5 text-sm" href={`mailto:${email}?subject=${encodeURIComponent(`Adde General - ${reference}`)}`}>Email customer</a>}
      {whatsapp !== false && digits && digits.length >= 8 && <a className="btn btn-whatsapp min-h-9 py-1.5 text-sm" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${digits}?text=${encodeURIComponent(`Hello, this is Adde General regarding ${reference}.`)}`}>WhatsApp</a>}
    </div>
  );
}
