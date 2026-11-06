import { sheetConfigured } from "@/lib/sheets";
import { fmtDate } from "./ui";

/** Shows whether a request reached the online tracking sheet, with a button to send it again. */
export function SheetStatus({ id, syncedAt, error, action }: {
  id: string; syncedAt: Date | null; error: string | null; action: (f: FormData) => Promise<void>;
}) {
  if (!sheetConfigured()) {
    return <p className="text-sm text-muted">Not connected. Set <code>SHEET_WEBHOOK_URL</code> to copy every quotation to Google Sheets (see docs/GOOGLE-SHEET.md).</p>;
  }
  return (
    <form action={action} className="space-y-3 text-sm">
      <input type="hidden" name="id" value={id} />
      {syncedAt
        ? <p><span className="chip chip-ok">Sent</span> <span className="text-muted">on {fmtDate(syncedAt)}</span></p>
        : error
          ? <p><span className="chip chip-bad">Failed</span> <span className="text-muted">{error}</span></p>
          : <p><span className="chip chip-warn">Pending</span> <span className="text-muted">Sending shortly after submission.</span></p>}
      <button className="btn btn-outline text-sm">{syncedAt ? "Send again (updates the row)" : "Send to sheet now"}</button>
    </form>
  );
}
