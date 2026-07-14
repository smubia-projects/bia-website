"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { animate, useReducedMotion } from "framer-motion";
import { MOTION_EASE } from "./motion";

function targetTop(element: HTMLElement) {
  const navOffset = 80;
  return Math.max(0, window.scrollY + element.getBoundingClientRect().top - navOffset);
}

export default function MotionScroll() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const scrollToElement = (element: HTMLElement) => {
      const top = targetTop(element);
      if (reduceMotion) {
        window.scrollTo(0, top);
        return;
      }
      animate(window.scrollY, top, {
        duration: 0.65,
        ease: MOTION_EASE,
        onUpdate: (latest) => window.scrollTo(0, latest),
      });
    };

    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>(
        'a[href*="#"]'
      );
      if (!anchor || anchor.target === "_blank" || event.defaultPrevented) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.pathname !== window.location.pathname || !url.hash) return;

      const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!target) return;

      event.preventDefault();
      window.history.pushState(null, "", url.hash);
      scrollToElement(target);
    };

    document.addEventListener("click", onClick);

    const hash = window.location.hash;
    if (hash) {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target) scrollToElement(target);
    }

    return () => document.removeEventListener("click", onClick);
  }, [pathname, reduceMotion]);

  return null;
}

