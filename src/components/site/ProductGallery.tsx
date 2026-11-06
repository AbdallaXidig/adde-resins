"use client";
import Image from "next/image";
import { useState } from "react";

type Img = { url: string; alt: string };

export function ProductGallery({ images, name }: { images: Img[]; name: string }) {
  const [active, setActive] = useState(0);
  const img = images[active];
  if (!img) return <div className="aspect-[4/3] rounded-xl bg-sand" />;
  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-sand shadow-card">
        <Image src={img.url} alt={img.alt} fill preload sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
          {images.map((m, i) => (
            <button key={m.url} type="button" onClick={() => setActive(i)} aria-label={`${name}: ${m.alt}`} aria-pressed={i === active}
              className={`relative size-20 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${i === active ? "border-orange" : "border-transparent hover:border-line"}`}>
              <Image src={m.url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
