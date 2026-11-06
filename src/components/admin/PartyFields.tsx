/** Contact fields shared by the customer and supplier forms. */
export const CUSTOMER_SOURCES: [string, string][] = [["WEBSITE", "Website"], ["WALK_IN", "Walk-in / office"], ["PHONE", "Phone call"], ["WHATSAPP", "WhatsApp"], ["REFERRAL", "Referral"], ["TRADE_FAIR", "Trade fair"], ["OTHER", "Other"]];
export const SOURCE_LABELS = Object.fromEntries(CUSTOMER_SOURCES) as Record<string, string>;

type Values = { [k: string]: unknown };

export function PartyFields({ kind, v: raw = {} }: { kind: "customer" | "supplier"; v?: Values }) {
  const v = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : "");
  const f = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div><label htmlFor={`${kind}-${name}`} className="field-label">{label}</label><input id={`${kind}-${name}`} name={name} defaultValue={v(name)} className="field" {...props} /></div>
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {f("name", "Name", { required: true, maxLength: 160 })}
      {kind === "customer" ? f("company", "Company", { maxLength: 160 }) : f("contact", "Contact person", { maxLength: 120 })}
      {f("phone", "Phone / WhatsApp", { type: "tel", maxLength: 40, dir: "ltr" })}
      {f("email", "Email (optional)", { type: "email", maxLength: 200 })}
      {f("country", "Country", { maxLength: 80 })}
      {kind === "customer" && (
        <div><label htmlFor="customer-source" className="field-label">How they reached us</label>
          <select id="customer-source" name="source" defaultValue={v("source") || "WALK_IN"} className="field">{CUSTOMER_SOURCES.map(([val, l]) => <option key={val} value={val}>{l}</option>)}</select></div>
      )}
      <div className="sm:col-span-2"><label htmlFor={`${kind}-address`} className="field-label">Address</label><textarea id={`${kind}-address`} name="address" rows={2} maxLength={500} defaultValue={v("address")} className="field" /></div>
      <div className="sm:col-span-2"><label htmlFor={`${kind}-notes`} className="field-label">Internal notes</label><textarea id={`${kind}-notes`} name="notes" rows={2} defaultValue={v("notes")} className="field" /></div>
    </div>
  );
}
