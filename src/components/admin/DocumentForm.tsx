"use client";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

export type ProductOption = { id: string; name: string; grades: string[]; price: number | null; cost: number | null };
export type PartyOption = { id: string; label: string };
export type Line = { productId?: string; description: string; grade?: string; quantity: number | string; unit: "KG" | "MT"; price: number | string };

type Common = {
  action: (f: FormData) => Promise<void>;
  products: ProductOption[];
  parties: PartyOption[];
  back: string;
  submitLabel: string;
};
type SalesProps = Common & {
  mode: "sales";
  initial: { id?: string; kind: "QUOTATION" | "INVOICE"; partyId?: string; issueDate: string; dueDate?: string; discount: number; shipping: number; tax: number; shipTo?: string; notes?: string; internalNotes?: string; lines: Line[] };
};
type PurchaseProps = Common & {
  mode: "purchase";
  initial: { id?: string; partyId?: string; orderDate: string; expectedDate?: string; supplierRef?: string; shipping: number; otherCosts: number; notes?: string; lines: Line[] };
};

const SOURCES = [["WALK_IN", "Walk-in / office"], ["PHONE", "Phone call"], ["WHATSAPP", "WhatsApp"], ["REFERRAL", "Referral"], ["TRADE_FAIR", "Trade fair"], ["WEBSITE", "Website"], ["OTHER", "Other"]];
const money = (n: number) => new Intl.NumberFormat("en", { style: "currency", currency: "USD" }).format(Number.isFinite(n) ? n : 0);
const toNum = (v: number | string) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const emptyLine = (): Line => ({ description: "", quantity: "", unit: "KG", price: "" });

/** Quotation, invoice and purchase editor. Totals here are a preview; the server recalculates them. */
export function DocumentForm(props: SalesProps | PurchaseProps) {
  const { mode, initial, products, parties, action, back, submitLabel } = props;
  const isSales = mode === "sales";
  const [party, setParty] = useState(initial.partyId ?? "");
  const [lines, setLines] = useState<Line[]>(initial.lines.length ? initial.lines : [emptyLine()]);
  const [charges, setCharges] = useState<Record<string, number | string>>(
    isSales ? { discount: props.initial.discount, shipping: props.initial.shipping, tax: props.initial.tax } : { shipping: props.initial.shipping, otherCosts: props.initial.otherCosts },
  );
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const kg = (l: Line) => toNum(l.quantity) * (l.unit === "MT" ? 1000 : 1);
  const lineTotal = (l: Line) => Math.round(toNum(l.price) * kg(l) * 100) / 100;
  const subtotal = lines.reduce((s, l) => s + lineTotal(l), 0);
  const total = isSales
    ? subtotal - toNum(charges.discount) + toNum(charges.shipping) + toNum(charges.tax)
    : subtotal + toNum(charges.shipping) + toNum(charges.otherCosts);

  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  function pickProduct(i: number, id: string) {
    const p = byId.get(id);
    if (!p) return setLine(i, { productId: undefined });
    const suggested = isSales ? p.price : p.cost;
    setLine(i, { productId: id, description: p.name, ...(suggested !== null && !toNum(lines[i].price) ? { price: suggested } : {}) });
  }

  const payload = JSON.stringify(lines.filter((l) => l.description || l.productId || toNum(l.quantity)).map((l) => ({
    productId: l.productId || undefined, description: l.description.trim(), grade: l.grade?.trim() || undefined,
    quantity: toNum(l.quantity), unit: l.unit, price: toNum(l.price),
  })));
  const priceLabel = isSales ? "Price per kg" : "Cost per kg";
  const partyWord = isSales ? "customer" : "supplier";

  return (
    <form action={action} className="space-y-6">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {isSales && <input type="hidden" name="kind" value={props.initial.kind} />}
      <input type="hidden" name="_back" value={back} />
      <input type="hidden" name="lines" value={payload} />

      <section className="card grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="md:col-span-2">
          <label htmlFor="party" className="field-label">{isSales ? "Customer" : "Supplier"}</label>
          <select id="party" name={isSales ? "customerId" : "supplierId"} required value={party} onChange={(e) => setParty(e.target.value)} className="field">
            <option value="" disabled>Choose a {partyWord}…</option>
            <option value="__new">+ New {partyWord}</option>
            {parties.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        {isSales ? (
          <>
            <div><label htmlFor="issueDate" className="field-label">Date</label><input id="issueDate" name="issueDate" type="date" required defaultValue={props.initial.issueDate} className="field" /></div>
            <div><label htmlFor="dueDate" className="field-label">{props.initial.kind === "QUOTATION" ? "Valid until" : "Payment due"}</label><input id="dueDate" name="dueDate" type="date" defaultValue={props.initial.dueDate} className="field" /></div>
          </>
        ) : (
          <>
            <div><label htmlFor="orderDate" className="field-label">Order date</label><input id="orderDate" name="orderDate" type="date" required defaultValue={props.initial.orderDate} className="field" /></div>
            <div><label htmlFor="expectedDate" className="field-label">Expected delivery</label><input id="expectedDate" name="expectedDate" type="date" defaultValue={props.initial.expectedDate} className="field" /></div>
            <div className="md:col-span-2"><label htmlFor="supplierRef" className="field-label">Supplier&apos;s invoice / reference (optional)</label><input id="supplierRef" name="supplierRef" maxLength={120} defaultValue={props.initial.supplierRef} className="field" /></div>
          </>
        )}

        {party === "__new" && (
          <fieldset className="grid gap-3 rounded-lg border border-dashed border-orange bg-[#fdf6f0] p-4 md:col-span-2 xl:col-span-4 md:grid-cols-3">
            <legend className="px-1 text-sm font-semibold text-brown">New {partyWord}</legend>
            <div><label htmlFor="new_name" className="field-label">Name</label><input id="new_name" name="new_name" required maxLength={160} className="field" /></div>
            <div><label htmlFor="new_phone" className="field-label">Phone / WhatsApp</label><input id="new_phone" name="new_phone" type="tel" maxLength={40} dir="ltr" className="field" /></div>
            <div><label htmlFor="new_email" className="field-label">Email (optional)</label><input id="new_email" name="new_email" type="email" maxLength={200} className="field" /></div>
            <div><label htmlFor="new_company" className="field-label">{isSales ? "Company" : "Contact person"}</label><input id="new_company" name={isSales ? "new_company" : "new_contact"} maxLength={160} className="field" /></div>
            <div><label htmlFor="new_country" className="field-label">Country</label><input id="new_country" name="new_country" maxLength={80} className="field" /></div>
            {isSales && <div><label htmlFor="new_source" className="field-label">How they reached us</label><select id="new_source" name="new_source" defaultValue="WALK_IN" className="field">{SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>}
          </fieldset>
        )}
      </section>

      <section className="card p-5">
        <h2 className="text-xl font-semibold">Items</h2>
        <p className="mt-1 text-sm text-muted">Prices are per kilogram. Quantities can be entered in KG or MT (1 MT = 1,000 kg).</p>
        <datalist id="grade-options">{[...new Set(products.flatMap((p) => p.grades))].map((g) => <option key={g} value={g} />)}</datalist>
        <div className="mt-4 space-y-3">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-2 gap-3 rounded-lg border border-line p-3 sm:grid-cols-4 2xl:grid-cols-[1.5fr_1.5fr_0.9fr_0.8fr_0.7fr_0.9fr_1fr_auto] 2xl:items-end">
              <div className="col-span-2"><label className="field-label text-xs" htmlFor={`p-${i}`}>Product</label>
                <select id={`p-${i}`} value={l.productId ?? ""} onChange={(e) => pickProduct(i, e.target.value)} className="field">
                  <option value="">Other / not in catalogue</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select></div>
              <div className="col-span-2"><label className="field-label text-xs" htmlFor={`d-${i}`}>Description</label><input id={`d-${i}`} value={l.description} maxLength={300} onChange={(e) => setLine(i, { description: e.target.value })} className="field" /></div>
              <div><label className="field-label text-xs" htmlFor={`g-${i}`}>Grade</label><input id={`g-${i}`} list="grade-options" value={l.grade ?? ""} maxLength={80} onChange={(e) => setLine(i, { grade: e.target.value })} className="field" /></div>
              <div><label className="field-label text-xs" htmlFor={`q-${i}`}>Quantity</label><input id={`q-${i}`} type="number" min="0" step="any" inputMode="decimal" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} className="field" /></div>
              <div><label className="field-label text-xs" htmlFor={`u-${i}`}>Unit</label><select id={`u-${i}`} value={l.unit} onChange={(e) => setLine(i, { unit: e.target.value as "KG" | "MT" })} className="field"><option>KG</option><option>MT</option></select></div>
              <div><label className="field-label text-xs" htmlFor={`pr-${i}`}>{priceLabel} (USD)</label><input id={`pr-${i}`} type="number" min="0" step="0.01" inputMode="decimal" value={l.price} onChange={(e) => setLine(i, { price: e.target.value })} className="field" /></div>
              <div><span className="field-label text-xs">Line total</span><p className="field flex items-center justify-end bg-cream font-semibold">{money(lineTotal(l))}</p></div>
              <button type="button" onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((_, j) => j !== i) : [emptyLine()]))} className="grid size-11 place-items-center self-end rounded-lg text-muted hover:bg-sand hover:text-burgundy" aria-label={`Remove line ${i + 1}`}><Trash2 size={18} aria-hidden /></button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setLines((ls) => [...ls, emptyLine()])} className="btn btn-outline mt-3"><Plus size={16} aria-hidden />Add line</button>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card grid gap-4 p-5">
          {isSales ? (
            <>
              <div><label htmlFor="shipTo" className="field-label">Ship to / destination</label><textarea id="shipTo" name="shipTo" rows={2} maxLength={500} defaultValue={props.initial.shipTo} className="field" /></div>
              <div><label htmlFor="notes" className="field-label">Notes printed on the document</label><textarea id="notes" name="notes" rows={3} maxLength={4000} defaultValue={props.initial.notes} placeholder="e.g. Packed in 25 kg bags. Price FOB Bosaso." className="field" /></div>
              <div><label htmlFor="internalNotes" className="field-label">Internal notes (staff only)</label><textarea id="internalNotes" name="internalNotes" rows={2} maxLength={4000} defaultValue={props.initial.internalNotes} className="field" /></div>
            </>
          ) : (
            <div><label htmlFor="notes" className="field-label">Notes</label><textarea id="notes" name="notes" rows={4} maxLength={4000} defaultValue={props.initial.notes} className="field" /></div>
          )}
        </section>
        <section className="card space-y-3 p-5">
          <h2 className="text-xl font-semibold">Totals (USD)</h2>
          <div className="flex justify-between text-sm"><span className="text-muted">Subtotal</span><span className="font-semibold">{money(subtotal)}</span></div>
          {(isSales ? [["discount", "Discount (−)"], ["shipping", "Shipping / freight (+)"], ["tax", "Tax (+)"]] : [["shipping", "Shipping / transport (+)"], ["otherCosts", "Other costs (+)"]]).map(([k, label]) => (
            <div key={k} className="grid grid-cols-[1fr_8rem] items-center gap-3">
              <label htmlFor={k} className="text-sm text-muted">{label}</label>
              <input id={k} name={k} type="number" min="0" step="0.01" inputMode="decimal" value={charges[k]} onChange={(e) => setCharges((c) => ({ ...c, [k]: e.target.value }))} className="field text-end" />
            </div>
          ))}
          <div className="flex justify-between border-t border-line pt-3 text-lg font-bold text-brown"><span>Total</span><span data-testid="doc-total">{money(total)}</span></div>
          {total < 0 && <p className="text-sm text-burgundy">The discount is larger than the total.</p>}
          <button type="submit" className="btn btn-primary w-full">{submitLabel}</button>
        </section>
      </div>
    </form>
  );
}
