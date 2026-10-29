"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ui from "@/app/components/cms/public.module.css";

/** Back to wherever the visitor came from on this site, else the programme's yearbook. */
export function BackPill({ fallbackHref, fallbackLabel }: { fallbackHref: string; fallbackLabel: string }) {
  const router = useRouter();
  const [fromSite, setFromSite] = useState<string | null>(null);

  useEffect(() => {
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      if (!ref || ref.origin !== window.location.origin) return;
      const p = ref.pathname;
      if (p.startsWith("/Projects/ai-lodge")) setFromSite("AI Lodge");
      else if (p.startsWith("/DAP/projects")) setFromSite("DAP projects");
      else if (p === "/Projects") setFromSite("all projects");
      else if (p === "/") setFromSite("home");
    } catch {
      // No usable referrer.
    }
  }, []);

  const icon = (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );

  if (fromSite) {
    return (
      <button type="button" className={ui.pill} onClick={() => router.back()}>
        {icon}Back to {fromSite}
      </button>
    );
  }
  return (
    <Link href={fallbackHref} className={ui.pill}>
      {icon}Back to {fallbackLabel}
    </Link>
  );
}

/** 16:9 screenshot carousel (scroll-snap, arrow buttons when there's more than one). */
export function Carousel({ images, title, winner }: { images: string[]; title: string; winner: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.offsetWidth, behavior: "smooth" });
  };
  return (
    <div className={`${ui.carousel} ${ui.coverFrame} ${winner ? ui.coverWinner : ""}`}>
      <div ref={track} className={ui.carouselTrack}>
        {images.map((src, i) => (
          <div key={src + i} className={ui.carouselSlide}>
            <Image
              src={src}
              alt={`${title} screenshot ${i + 1}`}
              fill
              sizes="(max-width: 1200px) 100vw, 780px"
              style={{ objectFit: "cover" }}
              priority={i === 0}
            />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button type="button" className={ui.carouselBtn} style={{ left: 12 }} onClick={() => scroll(-1)} aria-label="Previous image">
            ‹
          </button>
          <button type="button" className={ui.carouselBtn} style={{ right: 12 }} onClick={() => scroll(1)} aria-label="Next image">
            ›
          </button>
        </>
      )}
    </div>
  );
}
