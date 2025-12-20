"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export default function BackgroundLines() {
  const stripRef = useRef<HTMLDivElement | null>(null);

  useGSAP(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) return;

    // Move the strip to the LEFT forever.
    // Because we render two identical 100% width SVGs inside a 200% strip,
    // shifting by -50% loops seamlessly without showing empty space on the left.
    gsap.to(stripRef.current, {
      xPercent: -50,
      duration: 60,
      ease: "none",
      repeat: -1,
    });
  }, []);

  return (
    // Fixed to viewport so it ignores the global page padding and covers the full screen.
    <div className="pointer-events-none fixed inset-0 z-0 h-dvh w-dvw">
      {/* A 200% width strip so we can loop seamlessly */}
      <div ref={stripRef} className="absolute inset-0 w-[200%] will-change-transform">
        <div className="flex h-full w-full">
          <VectorsPanel />
          <VectorsPanel />
        </div>
      </div>
    </div>
  );
}

function VectorsPanel() {
  return (
    <div className="relative h-full w-1/2">
      {/* Single seamless SVG vector tile - 100% width so edges connect naturally */}
      <Image
        aria-hidden
        alt=""
        src="/vectors/Vector 1.svg"
        width={1203}
        height={570}
        className="w-full h-full"
        draggable={false}
        priority
      />
    </div>
  );
}
