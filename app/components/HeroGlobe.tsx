"use client";

import dynamic from "next/dynamic";

// three.js is client-only and heavy — load it lazily so it never blocks the
// hero's first paint. The heroCluster reserves the square, so no layout shift.
const HeroGlobeScene = dynamic(() => import("./HeroGlobeScene"), {
  ssr: false,
});

export default function HeroGlobe() {
  return <HeroGlobeScene />;
}
