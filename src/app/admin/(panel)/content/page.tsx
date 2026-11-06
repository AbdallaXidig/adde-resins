import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { EDITABLE_CONTENT } from "@/lib/content-keys";
import { saveContent } from "../../actions/site";
import { Flash, type FlashParams } from "@/components/admin/Flash";
import { PageHeader, Panel } from "@/components/admin/ui";
import en from "@/messages/en.json";
import so from "@/messages/so.json";
import ar from "@/messages/ar.json";

export const metadata = { title: "Website content" };
const FILES: Record<string, unknown> = { en, so, ar };
const get = (obj: unknown, key: string) => key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);

export default async function Content({ searchParams }: { searchParams: FlashParams }) {
  await requirePermission("content");
  const sp = await searchParams;
  const locale = ["en", "so", "ar"].includes(String(sp.locale)) ? String(sp.locale) : "en";
  const overrides = Object.fromEntries((await prisma.contentBlock.findMany({ where: { locale } })).map((b) => [b.key, b.value]));
  return (
    <>
      <Flash saved={sp.saved} error={sp.error} />
      <PageHeader title="Website content" text="Edit key website text without changing code. Empty fields use the built-in text, shown as a grey placeholder." />
      <nav className="mb-5 flex gap-2" aria-label="Language">
        {[["en", "English"], ["so", "Somali"], ["ar", "Arabic"]].map(([l, label]) => (
          <Link key={l} href={`/admin/content?locale=${l}`} aria-current={l === locale ? "page" : undefined} className={`btn min-h-9 py-1.5 ${l === locale ? "btn-primary" : "btn-outline"}`}>{label}</Link>
        ))}
      </nav>
      <form action={saveContent} className="space-y-5">
        <input type="hidden" name="locale" value={locale} /><input type="hidden" name="_back" value={`/admin/content?locale=${locale}`} />
        {EDITABLE_CONTENT.map((g) => (
          <Panel key={g.group} title={g.group}>
            <div className="grid gap-4 lg:grid-cols-2">
              {g.keys.map((k) => {
                const fallback = String(get(FILES[locale], k.key) ?? get(en, k.key) ?? "");
                const props = { id: k.key, name: `c_${k.key}`, defaultValue: overrides[k.key] ?? "", placeholder: fallback, dir: locale === "ar" ? "rtl" : "ltr", className: "field" };
                return (
                  <div key={k.key} className={k.long ? "lg:col-span-2" : ""}>
                    <label htmlFor={k.key} className="field-label">{k.label}{overrides[k.key] && <span className="chip ms-2">edited</span>}</label>
                    {k.long ? <textarea rows={3} {...props} /> : <input {...props} />}
                  </div>
                );
              })}
            </div>
          </Panel>
        ))}
        <button type="submit" className="btn btn-primary">Save {locale.toUpperCase()} content</button>
      </form>
    </>
  );
}
