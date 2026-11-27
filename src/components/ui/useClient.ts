"use client";

import { useSyncExternalStore } from "react";

/*
 * Client-only values without a setState-in-effect round trip. The server (and
 * the hydrating render) gets the fallback, the browser the real value, so
 * server and client HTML still match.
 */

const noSubscribe = () => () => {};

/** false on the server and during hydration, true once running in the browser */
export function useHydrated() {
  return useSyncExternalStore(noSubscribe, () => true, () => false);
}

/** window.matchMedia(query).matches, kept live; false on the server */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

/** A value read once from the browser (storage, seeds); `fallback` on the server */
export function useClientValue<T>(read: () => T, fallback: T) {
  return useSyncExternalStore(noSubscribe, read, () => fallback);
}
