import { METHOD_LABELS, PAYMENT_METHODS } from "@/lib/finance";
import { recordPaymentAction } from "@/app/admin/actions/finance";
import { accountOptions, todayInput } from "./finance-ui";

/** Records money received against an invoice, paid against a purchase, or a standalone payment. */
export async function PaymentForm({ back, documentId, purchaseId, direction = "IN", suggested, freeStanding }: {
  back: string; documentId?: string; purchaseId?: string; direction?: "IN" | "OUT"; suggested?: number; freeStanding?: boolean;
}) {
  const accounts = await accountOptions();
  return (
    <form action={recordPaymentAction} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="_back" value={back} />
      {documentId && <input type="hidden" name="documentId" value={documentId} />}
      {purchaseId && <input type="hidden" name="purchaseId" value={purchaseId} />}
      {freeStanding ? (
        <div className="sm:col-span-2"><label className="field-label" htmlFor="direction">Type</label>
          <select id="direction" name="direction" className="field" defaultValue={direction}><option value="IN">Money in (other income)</option><option value="OUT">Money out (other payment)</option></select></div>
      ) : <input type="hidden" name="direction" value={direction} />}
      <div><label className="field-label" htmlFor="amount">Amount (USD)</label><input id="amount" name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" required defaultValue={suggested && suggested > 0 ? suggested.toFixed(2) : ""} className="field" /></div>
      <div><label className="field-label" htmlFor="date">Date</label><input id="date" name="date" type="date" required defaultValue={todayInput()} className="field" /></div>
      <div><label className="field-label" htmlFor="method">Method</label><select id="method" name="method" className="field" defaultValue="CASH">{PAYMENT_METHODS.map((m) => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}</select></div>
      <div><label className="field-label" htmlFor="accountId">Account</label><select id="accountId" name="accountId" className="field"><option value="">Not specified</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
      <div className="sm:col-span-2"><label className="field-label" htmlFor="reference">Transaction ID / reference</label><input id="reference" name="reference" maxLength={120} className="field" /></div>
      <div className="sm:col-span-2"><label className="field-label" htmlFor="pnotes">Notes</label><input id="pnotes" name="notes" maxLength={1000} className="field" /></div>
      <button type="submit" className="btn btn-primary sm:col-span-2">{direction === "IN" || freeStanding ? "Record payment" : "Record payment to supplier"}</button>
    </form>
  );
}
