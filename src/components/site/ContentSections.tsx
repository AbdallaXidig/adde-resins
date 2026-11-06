import Image from "next/image";

/** Alternating text and image rows used by the long-form content pages. */
export function SplitRow({ title, text, image, alt, caption, flip, children }: {
  title: string; text: string; image: string; alt: string; caption?: string; flip?: boolean; children?: React.ReactNode;
}) {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
      <figure className={`relative aspect-[4/3] overflow-hidden rounded-2xl shadow-card ${flip ? "lg:order-2" : ""}`}>
        <Image src={image} alt={alt} fill sizes="(min-width:1024px) 45vw, 100vw" className="object-cover" />
        {caption && <figcaption className="absolute bottom-2 start-2 rounded bg-black/60 px-2 py-0.5 text-[11px] text-white">{caption}</figcaption>}
      </figure>
      <div>
        <h2 className="h-section">{title}</h2>
        <p className="mt-4 text-lg text-muted">{text}</p>
        {children}
      </div>
    </div>
  );
}

export function CtaBand({ title, primary, secondary }: { title: string; primary: React.ReactNode; secondary?: React.ReactNode }) {
  return (
    <section className="bg-brown">
      <div className="wrap flex flex-col items-start justify-between gap-5 py-12 md:flex-row md:items-center">
        <h2 className="font-serif text-3xl !text-white">{title}</h2>
        <div className="flex flex-wrap gap-3">{primary}{secondary}</div>
      </div>
    </section>
  );
}
