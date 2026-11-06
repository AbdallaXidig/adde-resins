import { requirePermission } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { saveSettings } from "../../actions/site";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { PageHeader, Panel } from "@/components/admin/ui";

export const metadata = { title: "Settings" };

export default async function Settings({ searchParams }: { searchParams: FlashParams }) {
  await requirePermission("settings");
  const sp = await searchParams;
  const s = await getSettings();
  const fields: [keyof typeof s, string, string?][] = [
    ["companyName", "Company name"], ["email", "Official email"], ["phone", "Telephone (as displayed)"],
    ["whatsapp", "WhatsApp number", "Digits with country code, e.g. 252617794700"], ["location", "Business location"], ["hours", "Business hours"],
    ["linkedin", "LinkedIn URL", "Leave empty to hide"], ["facebook", "Facebook URL", "Leave empty to hide"], ["youtube", "YouTube URL", "Leave empty to hide"],
  ];
  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title="Settings" text="Contact details and site behaviour shown across the website." />
      <form action={saveSettings} className="max-w-3xl space-y-5">
        <input type="hidden" name="_back" value="/admin/settings" />
        <Panel title="Company and contact">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(([k, label, hint]) => (
              <div key={k}><label htmlFor={k} className="field-label">{label}</label><input id={k} name={k} defaultValue={String(s[k] ?? "")} className="field" />{hint && <p className="mt-1 text-xs text-muted">{hint}</p>}</div>
            ))}
          </div>
        </Panel>
        <Panel title="Catalogue and orders">
          <label className="flex items-center gap-2"><input type="checkbox" name="showSampleBanner" defaultChecked={s.showSampleBanner} /> Show the sample-data notice while any published product is sample data</label>
          <div className="mt-4 max-w-xs"><label htmlFor="bulkThresholdKg" className="field-label">Suggest a quotation above (kg)</label><input id="bulkThresholdKg" name="bulkThresholdKg" type="number" min="0" defaultValue={s.bulkThresholdKg} className="field" /></div>
        </Panel>
        <Panel title="Invoices">
          <label htmlFor="paymentInstructions" className="field-label">Payment instructions printed on every invoice</label>
          <textarea id="paymentInstructions" name="paymentInstructions" rows={5} maxLength={2000} defaultValue={s.paymentInstructions} className="field" placeholder={"Bank: …  Account name: Adde International L.L.C.  Account no.: …\nEVC Plus: …\nPlease quote the invoice number with your payment."} />
          <p className="mt-1 text-xs text-muted">Only shown on invoices, not quotations. Leave empty to leave it off.</p>
        </Panel>
        <Panel title="Online payments">
          <p className="text-sm text-muted">No payment provider is connected. Checkout saves the order and your team follows up with an invoice. A developer can connect a provider later through <code>PAYMENT_PROVIDER</code> and <code>src/lib/payments.ts</code>.</p>
        </Panel>
        <button type="submit" className="btn btn-primary">Save settings</button>
      </form>
    </>
  );
}
