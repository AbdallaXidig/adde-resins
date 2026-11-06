import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, BadgeCheck, CheckCircle2, FlaskConical, Globe2, Handshake, Leaf, PackageCheck, Ship, Sparkles, Flower2, Droplets, Pill, Flame, Truck, Layers, CalendarCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getPublishedProducts } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";
import { HeroCarousel } from "@/components/site/HeroCarousel";
import { ProductCardCompact } from "@/components/site/ProductCard";
import { InquiryForm } from "@/components/site/InquiryForm";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { ...pageMetadata({ locale, path: "/", title: t("defaultTitle"), description: t("defaultDescription") }), title: { absolute: t("defaultTitle") } };
}

const INDUSTRY_ICONS = [Pill, Sparkles, Flower2, Droplets, Leaf, Flame];
const PILLAR_ICONS = [Truck, Layers, Leaf, Handshake];
const WHY_ICONS = [Globe2, BadgeCheck, PackageCheck, CheckCircle2];

export default async function HomePage() {
  const t = await getTranslations("home");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const products = await getPublishedProducts(locale);
  const featured = (products.filter((p) => p.featured).length ? products.filter((p) => p.featured) : products).slice(0, 4);
  const years = new Date().getFullYear() - 2003;

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-brown">
        <HeroCarousel captions={t.raw("slideCaptions") as string[]} />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#2a160b]/95 via-[#2a160b]/75 to-[#2a160b]/10 rtl:bg-gradient-to-l" />
        <div className="wrap flex min-h-[560px] flex-col justify-center pb-24 pt-14 lg:min-h-[620px]">
          <p className="eyebrow !text-gold before:!bg-orange">{t("heroEyebrow")}</p>
          <h1 className="mt-4 max-w-3xl text-[clamp(2.4rem,1.5rem+4vw,4.25rem)] font-semibold !text-white">
            {t("heroTitle")}
            <span className="block italic text-gold">{t("heroAccent")}</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/90">{t("heroDescription")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/products" className="btn btn-primary px-6 text-base">{tc("exploreProducts")}<ArrowRight size={18} aria-hidden className="rtl:rotate-180" /></Link>
            <Link href="/quote" className="btn btn-ghost-light px-6 text-base">{tc("requestQuote")}</Link>
          </div>
          <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2.5 text-[15px] text-white/90">
            {(t.raw("heroPoints") as string[]).map((p) => (
              <li key={p} className="inline-flex items-center gap-2"><CheckCircle2 size={18} aria-hidden className="text-gold" />{p}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Featured products */}
      <section className="section !pb-14">
        <div className="wrap grid gap-8 lg:grid-cols-[minmax(240px,1fr)_3fr] lg:items-start">
          <div className="lg:sticky lg:top-32">
            <p className="eyebrow">{t("productsEyebrow")}</p>
            <h2 className="h-section mt-3">{t("productsTitle")}</h2>
            <p className="mt-3 text-muted">{t("productsText")}</p>
            <Link href="/products" className="btn btn-outline mt-6">{tc("viewAllProducts")}<ArrowRight size={17} aria-hidden className="rtl:rotate-180" /></Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {featured.map((p) => <ProductCardCompact key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      {/* Industries band */}
      <section className="relative overflow-hidden bg-brown text-white">
        <div className="wrap grid gap-8 py-10 lg:grid-cols-[220px_1fr] lg:items-center">
          <h2 className="border-s-4 border-orange ps-4 font-serif text-3xl !text-white">{t("industriesTitle")}</h2>
          <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10 sm:grid-cols-3 lg:grid-cols-6">
            {(t.raw("industries") as string[]).map((name, i) => {
              const Icon = INDUSTRY_ICONS[i % INDUSTRY_ICONS.length];
              return (
                <li key={name} className="bg-brown">
                  <Link href="/industries" className="flex h-full flex-col items-center gap-3 px-3 py-6 text-center text-[15px] transition-colors hover:bg-brown-soft">
                    <Icon size={34} strokeWidth={1.4} aria-hidden className="text-gold" />{name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Pillars */}
      <section className="border-b border-line bg-white">
        <ul className="wrap grid gap-6 py-9 sm:grid-cols-2 lg:grid-cols-4">
          {(t.raw("pillars") as { title: string; text: string }[]).map((p, i) => {
            const Icon = PILLAR_ICONS[i];
            return (
              <li key={p.title} className="flex gap-3.5">
                <Icon size={34} strokeWidth={1.5} aria-hidden className="shrink-0 text-orange-dark" />
                <div><h3 className="font-sans text-base font-semibold">{p.title}</h3><p className="text-sm text-muted">{p.text}</p></div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Company introduction */}
      <section className="section">
        <div className="wrap grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-lift">
              <Image src="/assets/img/somalia-karin-trees.webp" alt="Acacia trees on red earth at Karin near Bosaso, Somalia" fill sizes="(min-width:1024px) 45vw, 100vw" className="object-cover" />
            </div>
            <div className="absolute -bottom-6 end-4 rounded-xl bg-orange-dark px-6 py-4 text-white shadow-lift">
              <p className="font-serif text-4xl font-semibold leading-none">{years}+</p>
              <p className="mt-1 max-w-[11rem] text-sm text-white/90">{t("yearsLabel")}</p>
            </div>
          </div>
          <div>
            <p className="eyebrow">{t("introEyebrow")}</p>
            <h2 className="h-section mt-3">{t("introTitle")}</h2>
            <p className="mt-4 text-lg text-muted">{t("introText")}</p>
            <Link href="/about" className="btn btn-outline mt-7">{t("introCta")}<ArrowRight size={17} aria-hidden className="rtl:rotate-180" /></Link>
          </div>
        </div>
      </section>

      {/* Why choose */}
      <section className="section bg-sand/60">
        <div className="wrap">
          <div className="max-w-2xl">
            <p className="eyebrow">{t("whyEyebrow")}</p>
            <h2 className="h-section mt-3">{t("whyTitle")}</h2>
          </div>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(t.raw("why") as { title: string; text: string }[]).map((w, i) => {
              const Icon = WHY_ICONS[i];
              return (
                <li key={w.title} className="card p-6 transition-transform hover:-translate-y-1">
                  <span className="grid size-12 place-items-center rounded-xl bg-orange/10 text-orange-dark"><Icon size={24} aria-hidden /></span>
                  <h3 className="mt-4 text-xl font-semibold">{w.title}</h3>
                  <p className="mt-2 text-[15px] text-muted">{w.text}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Sourcing & quality */}
      <section className="section">
        <div className="wrap grid items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div>
            <p className="eyebrow">{t("sourcingEyebrow")}</p>
            <h2 className="h-section mt-3">{t("sourcingTitle")}</h2>
            <p className="mt-4 text-lg text-muted">{t("sourcingText")}</p>
            <ol className="mt-7 grid gap-3 sm:grid-cols-2">
              {(t.raw("sourcingSteps") as string[]).map((s, i) => (
                <li key={s} className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brown font-serif text-sm font-semibold text-white">{i + 1}</span>
                  <span className="font-medium text-brown">{s}</span>
                </li>
              ))}
            </ol>
            <Link href="/sourcing-quality" className="btn btn-outline mt-7">{t("sourcingCta")}<ArrowRight size={17} aria-hidden className="rtl:rotate-180" /></Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <figure className="relative col-span-2 aspect-[16/9] overflow-hidden rounded-2xl shadow-card">
              <Image src="/assets/img/tree-resin-on-bark.webp" alt="White frankincense resin beads forming on Boswellia bark" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
              <figcaption className="absolute bottom-2 start-2 rounded bg-black/55 px-2 py-0.5 text-[11px] text-white">{tc("photoNote")}</figcaption>
            </figure>
            <div className="relative aspect-square overflow-hidden rounded-2xl shadow-card">
              <Image src="/assets/img/resin-grey-bowl.webp" alt="Boswellia resin in a grey stone bowl" fill sizes="25vw" className="object-cover" />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-2xl shadow-card">
              <Image src="/assets/img/myrrh-glass-dish.webp" alt="Dark rough myrrh lumps in a glass dish" fill sizes="25vw" className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Export & logistics */}
      <section className="relative isolate overflow-hidden bg-brown text-white">
        <Image src="/assets/img/somalia-bosaso-port.webp" alt="" fill sizes="100vw" className="-z-10 object-cover opacity-35" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-l from-brown via-brown/85 to-brown/40 rtl:bg-gradient-to-r" />
        <div className="wrap section grid gap-10 lg:grid-cols-2">
          <div className="hidden lg:block" />
          <div>
            <p className="eyebrow !text-gold before:!bg-gold">{t("exportEyebrow")}</p>
            <h2 className="h-section mt-3 !text-white">{t("exportTitle")}</h2>
            <p className="mt-4 text-lg text-white/85">{t("exportText")}</p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {(t.raw("exportPoints") as string[]).map((p, i) => {
                const Icon = [Ship, PackageCheck, FlaskConical, CalendarCheck][i] ?? Ship;
                return <li key={p} className="flex items-start gap-2.5"><Icon size={20} aria-hidden className="mt-0.5 shrink-0 text-gold" />{p}</li>;
              })}
            </ul>
            <Link href="/services" className="btn btn-ghost-light mt-8">{t("exportCta")}<ArrowRight size={17} aria-hidden className="rtl:rotate-180" /></Link>
            <p className="mt-6 text-xs text-white/60">{t("photoSomalia")}</p>
          </div>
        </div>
      </section>

      {/* Inquiry */}
      <section className="section">
        <div className="wrap grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div>
            <p className="eyebrow">{t("inquiryEyebrow")}</p>
            <h2 className="h-section mt-3">{t("inquiryTitle")}</h2>
            <p className="mt-4 text-lg text-muted">{t("inquiryText")}</p>
            <Link href="/quote" className="btn btn-primary mt-7">{tc("requestQuote")}<ArrowRight size={17} aria-hidden className="rtl:rotate-180" /></Link>
          </div>
          <div className="card p-6 sm:p-8"><InquiryForm compact /></div>
        </div>
      </section>
    </>
  );
}
