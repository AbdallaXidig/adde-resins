import Image from "next/image";
import type { Category, Product, ProductImage, ProductSpec } from "@prisma/client";

type Full = Product & { images: ProductImage[]; specs: ProductSpec[] };
type T = Record<string, Record<string, string>>;

const L = ({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) => <label htmlFor={htmlFor} className="field-label">{children}</label>;
const Hint = ({ children }: { children: React.ReactNode }) => <p className="mt-1 text-xs text-muted">{children}</p>;

export function ProductForm({ product, categories, action, canPrice }: {
  product?: Full; categories: Category[]; action: (f: FormData) => Promise<void>; canPrice: boolean;
}) {
  const p = product;
  const tr = (p?.translations ?? {}) as T;
  const specs = p?.specs.map((s) => `${s.label} | ${s.value}${s.verified ? " | verified" : ""}`).join("\n") ?? "Moisture | To be confirmed\nForeign matter | To be confirmed";
  const box = "card space-y-4 p-5";
  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[1fr_340px]">
      {p && <input type="hidden" name="id" value={p.id} />}
      <input type="hidden" name="_back" value={p ? `/admin/products/${p.id}` : "/admin/products/new"} />
      <div className="space-y-6">
        <section className={box}>
          <h2 className="text-xl font-semibold">Basics</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><L htmlFor="name">Product name *</L><input id="name" name="name" required defaultValue={p?.name} className="field" /></div>
            <div><L htmlFor="botanicalName">Botanical name</L><input id="botanicalName" name="botanicalName" defaultValue={p?.botanicalName ?? ""} className="field" /></div>
            <div><L htmlFor="localName">Somali / local name</L><input id="localName" name="localName" defaultValue={p?.localName ?? ""} className="field" /></div>
            <div><L htmlFor="origin">Origin</L><input id="origin" name="origin" defaultValue={p?.origin ?? "Somalia"} className="field" /></div>
            <div><L htmlFor="grade">Grade (summary)</L><input id="grade" name="grade" defaultValue={p?.grade ?? ""} className="field" /></div>
            <div className="sm:col-span-2"><L htmlFor="shortDescription">Short description *</L><input id="shortDescription" name="shortDescription" required maxLength={300} defaultValue={p?.shortDescription} className="field" /><Hint>Shown on product cards.</Hint></div>
            <div className="sm:col-span-2"><L htmlFor="description">Full description *</L><textarea id="description" name="description" required rows={5} defaultValue={p?.description} className="field" /></div>
            <div className="sm:col-span-2"><L htmlFor="botanicalInfo">Botanical information</L><textarea id="botanicalInfo" name="botanicalInfo" rows={3} defaultValue={p?.botanicalInfo ?? ""} className="field" /></div>
          </div>
        </section>

        <section className={box}>
          <h2 className="text-xl font-semibold">Grades, specifications and packaging</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><L htmlFor="gradeOptions">Grade options</L><textarea id="gradeOptions" name="gradeOptions" rows={3} defaultValue={p?.gradeOptions.join("\n")} className="field" /><Hint>One per line. Buyers choose from these.</Hint></div>
            <div><L htmlFor="packagingOptions">Packaging options</L><textarea id="packagingOptions" name="packagingOptions" rows={3} defaultValue={p?.packagingOptions.join("\n")} className="field" /><Hint>One per line. Hidden while “Sample data” is ticked.</Hint></div>
            <div><L htmlFor="quantityOptions">Available quantities</L><textarea id="quantityOptions" name="quantityOptions" rows={3} defaultValue={p?.quantityOptions.join("\n")} className="field" /></div>
            <div><L htmlFor="gradingInfo">Grade and sorting notes</L><textarea id="gradingInfo" name="gradingInfo" rows={3} defaultValue={p?.gradingInfo ?? ""} className="field" /></div>
            <div className="sm:col-span-2"><L htmlFor="specs">Quality specifications</L><textarea id="specs" name="specs" rows={5} defaultValue={specs} className="field font-mono text-sm" />
              <Hint>One per line as <code>Label | Value</code>. Add <code>| verified</code> only when the value is backed by a lab report or certificate for current stock. Unverified values appear as “to be confirmed”.</Hint></div>
            <div><L htmlFor="moq">Minimum order quantity</L><div className="flex gap-2"><input id="moq" name="moq" type="number" min="0" step="any" defaultValue={p?.moq?.toString() ?? ""} className="field" />
              <select name="moqUnit" defaultValue={p?.moqUnit ?? "KG"} className="field w-24" aria-label="MOQ unit"><option>KG</option><option>MT</option></select></div><Hint>Leave empty for “confirmed on quotation”.</Hint></div>
          </div>
        </section>

        <section className={box}>
          <h2 className="text-xl font-semibold">Images</h2>
          {p && p.images.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-2">
              {p.images.map((img) => (
                <li key={img.id} className="flex gap-3 rounded-lg border border-line p-3">
                  <Image src={img.url} alt="" width={96} height={72} className="h-[72px] w-24 shrink-0 rounded object-cover" />
                  <div className="min-w-0 flex-1 space-y-1.5 text-sm">
                    <input name={`img_alt_${img.id}`} defaultValue={img.alt} aria-label="Alt text" className="field min-h-9 py-1 text-sm" />
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-1">Order <input name={`img_order_${img.id}`} type="number" defaultValue={img.sortOrder} className="field min-h-8 w-16 py-0.5 text-sm" /></label>
                      <label className="flex items-center gap-1"><input type="checkbox" name={`img_placeholder_${img.id}`} defaultChecked={img.isPlaceholder} /> Stock photo</label>
                      <label className="flex items-center gap-1 text-burgundy"><input type="checkbox" name={`img_remove_${img.id}`} /> Remove</label>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div><L htmlFor="images">Upload images</L><input id="images" name="images" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="field py-2" />
            <Hint>JPEG, PNG, WebP or AVIF up to 10 MB each. Images are resized and converted to WebP. Use company-owned product photos where possible.</Hint></div>
        </section>

        <section className={box}>
          <h2 className="text-xl font-semibold">Translations</h2>
          <p className="text-sm text-muted">Leave empty to show the English text.</p>
          {(["so", "ar"] as const).map((l) => (
            <fieldset key={l} className="grid gap-3 rounded-lg border border-line p-4" dir={l === "ar" ? "rtl" : "ltr"}>
              <legend className="px-1 text-sm font-semibold text-brown">{l === "so" ? "Somali" : "Arabic"}</legend>
              <input name={`${l}_name`} defaultValue={tr[l]?.name ?? ""} placeholder="Name" aria-label={`${l} name`} className="field" />
              <input name={`${l}_shortDescription`} defaultValue={tr[l]?.shortDescription ?? ""} placeholder="Short description" aria-label={`${l} short description`} className="field" />
              <textarea name={`${l}_description`} rows={3} defaultValue={tr[l]?.description ?? ""} placeholder="Full description" aria-label={`${l} description`} className="field" />
            </fieldset>
          ))}
        </section>
      </div>

      <aside className="space-y-6">
        <section className={box}>
          <h2 className="text-xl font-semibold">Publishing</h2>
          <div><L htmlFor="status">Status</L><select id="status" name="status" defaultValue={p?.status ?? "DRAFT"} className="field"><option value="DRAFT">Draft (hidden)</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived (hidden)</option></select></div>
          <div><L htmlFor="categoryId">Category *</L><select id="categoryId" name="categoryId" required defaultValue={p?.categoryId ?? ""} className="field"><option value="" disabled>Choose</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><L htmlFor="availability">Availability</L><select id="availability" name="availability" defaultValue={p?.availability ?? "ON_REQUEST"} className="field"><option value="AVAILABLE">Available</option><option value="ON_REQUEST">On request</option><option value="OUT_OF_SEASON">Out of season</option><option value="UNAVAILABLE">Unavailable</option></select></div>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" name="cartEnabled" defaultChecked={p?.cartEnabled ?? true} /> Allow “Add to cart”</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="featured" defaultChecked={p?.featured} /> Feature on homepage</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="isDemo" defaultChecked={p?.isDemo ?? false} /> Sample data (shows a label)</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="verified" defaultChecked={p?.verified} /> Details verified by staff</label>
          </div>
          <div><L htmlFor="sortOrder">Display order</L><input id="sortOrder" name="sortOrder" type="number" defaultValue={p?.sortOrder ?? 0} className="field" /></div>
        </section>
        {canPrice ? (
          <section className={box}>
            <h2 className="text-xl font-semibold">Pricing</h2>
            <div className="flex gap-2">
              <div className="flex-1"><L htmlFor="pricePerKg">Price per kg</L><input id="pricePerKg" name="pricePerKg" type="number" min="0" step="0.01" defaultValue={p?.pricePerKg?.toString() ?? ""} className="field" /></div>
              <div className="w-24"><L htmlFor="currency">Currency</L><input id="currency" name="currency" maxLength={3} defaultValue={p?.currency ?? "USD"} className="field uppercase" /></div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="priceVisible" defaultChecked={p?.priceVisible} /> Show price on website</label>
            <Hint>Without a visible price, buyers see “Price on request” and staff quote each order.</Hint>
          </section>
        ) : <p className="text-sm text-muted">Prices are managed by managers and super admins.</p>}
        <section className={box}>
          <h2 className="text-xl font-semibold">Search engines</h2>
          <div><L htmlFor="slug">URL slug</L><input id="slug" name="slug" defaultValue={p?.slug ?? ""} className="field font-mono text-sm" /><Hint>Leave empty to generate from the name.</Hint></div>
          <div><L htmlFor="seoTitle">SEO title</L><input id="seoTitle" name="seoTitle" maxLength={160} defaultValue={p?.seoTitle ?? ""} className="field" /></div>
          <div><L htmlFor="seoDescription">SEO description</L><textarea id="seoDescription" name="seoDescription" rows={3} maxLength={320} defaultValue={p?.seoDescription ?? ""} className="field" /></div>
        </section>
        <button type="submit" className="btn btn-primary w-full">{p ? "Save product" : "Create product"}</button>
      </aside>
    </form>
  );
}
