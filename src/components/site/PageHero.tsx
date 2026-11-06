import Image from "next/image";

type Props = { eyebrow: string; title: string; text?: string; image: string; alt?: string; caption?: string };

export function PageHero({ eyebrow, title, text, image, caption }: Props) {
  return (
    <section className="relative isolate overflow-hidden bg-brown">
      <Image src={image} alt="" fill preload sizes="100vw" className="-z-10 object-cover opacity-45" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brown via-brown/80 to-brown/20 rtl:bg-gradient-to-l" />
      <div className="wrap py-14 lg:py-20">
        <p className="eyebrow !text-gold before:!bg-gold">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-[clamp(2rem,1.4rem+2.6vw,3.25rem)] font-semibold !text-white">{title}</h1>
        {text && <p className="mt-4 max-w-2xl text-lg text-white/90">{text}</p>}
        {caption && <p className="mt-5 text-xs text-white/65">{caption}</p>}
      </div>
    </section>
  );
}
