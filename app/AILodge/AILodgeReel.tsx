"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { animate, useReducedMotion } from "framer-motion";
import styles from "./page.module.css";

export default function AILodgeReel({
  images,
}: {
  images: readonly { src: string; alt: string }[];
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const track = trackRef.current;
    if (!track || reduceMotion) return;

    const controls = animate(track, { x: ["0%", "-50%"] }, {
      duration: 46,
      ease: "linear",
      repeat: Infinity,
      repeatType: "loop",
    });

    const pause = () => controls.pause();
    const play = () => controls.play();
    track.addEventListener("pointerenter", pause);
    track.addEventListener("pointerleave", play);

    return () => {
      controls.stop();
      track.removeEventListener("pointerenter", pause);
      track.removeEventListener("pointerleave", play);
    };
  }, [reduceMotion]);

  return (
    <div className={styles.reelViewport}>
      <div className={styles.reelTrack} ref={trackRef}>
        {[...images, ...images].map((img, i) => (
          <div className={styles.reelItem} key={`${img.src}-${i}`}>
            <Image
              src={img.src}
              alt={i < images.length ? img.alt : ""}
              fill
              sizes="(max-width: 640px) 55vw, 15rem"
              className={styles.photoImg}
            />
          </div>
        ))}
      </div>
      <div className={styles.reelFadeLeft} aria-hidden="true" />
      <div className={styles.reelFadeRight} aria-hidden="true" />
    </div>
  );
}
