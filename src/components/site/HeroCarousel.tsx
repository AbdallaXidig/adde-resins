"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

const SLIDES = [
  { src: "/assets/img/somalia-karin-bosaso.webp", position: "center 60%" },
  { src: "/assets/img/resin-bowl-closeup.webp", position: "center" },
  { src: "/assets/img/somalia-bosaso-port.webp", position: "center" },
];
const INTERVAL = 7000;

export function HeroCarousel({ captions }: { captions: string[] }) {
  const t = useTranslations("common");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), INTERVAL);
    return () => clearInterval(timer);
  }, [playing]);

  const go = (d: number) => setIndex((i) => (i + d + SLIDES.length) % SLIDES.length);
  const control = "grid size-11 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/30";

  return (
    <>
      {SLIDES.map((s, i) => (
        <Image
          key={s.src}
          src={s.src}
          alt=""
          fill
          sizes="100vw"
          preload={i === 0}
          loading={i === 0 ? undefined : "lazy"}
          style={{ objectPosition: s.position, opacity: i === index ? 1 : 0 }}
          className="hero-slide -z-20 object-cover"
        />
      ))}
      <div className="absolute inset-x-0 bottom-3 z-10">
        <div className="wrap flex items-center justify-end gap-2">
          <p className="me-auto truncate text-xs text-white/80" aria-live="off">{captions[index]}</p>
          <button type="button" className={control} onClick={() => go(-1)} aria-label={t("previous")}><ChevronLeft size={20} aria-hidden className="rtl:rotate-180" /></button>
          <button type="button" className={control} onClick={() => setPlaying((p) => !p)} aria-label={playing ? t("pause") : t("play")}>
            {playing ? <Pause size={17} aria-hidden /> : <Play size={17} aria-hidden />}
          </button>
          <button type="button" className={control} onClick={() => go(1)} aria-label={t("next")}><ChevronRight size={20} aria-hidden className="rtl:rotate-180" /></button>
        </div>
      </div>
    </>
  );
}
