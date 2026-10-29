import { MONO_PALETTE, TRACK_ACCENTS } from "@/app/lib/cms/taxonomy";

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Two-letter monogram for projects without a cover image. */
export function monogram(title: string) {
  const words = title.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return (words[0][0] + (words[1] ? words[1][0] : words[0][1] ?? "")).toUpperCase();
}

export function monoColors(title: string): [string, string] {
  return MONO_PALETTE[hash(title) % MONO_PALETTE.length];
}

export const trackAccent = (position: number | undefined) =>
  TRACK_ACCENTS[(position ?? 0) % TRACK_ACCENTS.length];

/** Programme dot colour on the thumbnail wall. */
export const programmeDot = (programme: string) => (programme === "DAP" ? "#0e7c5b" : "#e0a526");

/** Seeded shuffle (mulberry32) so a visitor sees one stable order per visit. */
export function shuffle<T>(items: T[], seed: number): T[] {
  let a = seed | 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** One seed per browser tab, so order survives navigating between project pages. */
export function visitSeed(): number {
  try {
    const stored = sessionStorage.getItem("bia-shuffle-seed");
    if (stored) return Number(stored);
    const seed = Math.floor(Math.random() * 1e9);
    sessionStorage.setItem("bia-shuffle-seed", String(seed));
    return seed;
  } catch {
    return Math.floor(Math.random() * 1e9);
  }
}
