import Image from "next/image";

// The client's official logo, unmodified apart from trimming the white page margin.
// It has a white ground, so on dark sections it always sits on a white plate.
export function Logo({ className, preload }: { className?: string; preload?: boolean }) {
  return (
    <Image
      src="/assets/brand/adde-logo.png"
      alt="Adde General LLC, established 2003"
      // Display-sized intrinsic dimensions (about 2.75:1 ratio) so the optimiser serves a
      // crisp 2x file rather than the 3840px variant.
      width={330}
      height={120}
      preload={preload}
      className={className}
    />
  );
}
