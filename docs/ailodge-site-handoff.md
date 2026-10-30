# AI Lodge site: switching to CMS data from smubia.com

This document is for whoever works on the AI Lodge site (ailodge.smubia.com, the
`ailodge-infosite` repo: Next 16, React 19, Tailwind 4, GSAP). The lodges, captains,
weekly trails, applications timeline, art and every Apply/Join link now live in the
smubia.com CMS. The AI Lodge site should read them from one public endpoint instead of
`src/data/lodges.ts` and hard-coded links.

The two sites will be merged into one repo later, after smubia.com moves to Next 16.
Until then this endpoint is the contract between them.

## 1. The endpoint

```
GET https://www.smubia.com/api/public/ailodge
GET https://www.smubia.com/api/public/ailodge?semester=ay2526-s2
```

- Public and read-only. No key, no auth, nothing private in it.
- CORS: `Access-Control-Allow-Origin: *` (GET and OPTIONS).
- Cached at Vercel's edge for 60 s (`s-maxage=60, stale-while-revalidate=600`). Edits in
  the CMS show up within about a minute.
- `?semester=<slug>` returns that semester as `semester` (404 if it isn't public).
  Without it, `semester` is the current one.
- 503 with `{ "error": "…" }` if the database is unreachable. Keep a fallback (see §4).

### Response shape (version 1)

`version` is bumped only when a field is renamed or removed; new fields can appear at any
time, so ignore fields you don't know.

```ts
type AILodgeFeed = {
  version: 1;
  generatedAt: string; // ISO time

  applications: {
    open: boolean;       // the AI Lodge applications switch in the CMS
    url: string;         // where site-wide "Apply now" / "Join us now" go:
                         // the form when open, the club Telegram when closed
    formUrl: string;     // the application form, regardless of the switch
    telegramUrl: string; // the club Telegram
  };

  links: {
    site: string;     // https://ailodge.smubia.com (as set in the CMS)
    smubia: string;   // https://www.smubia.com
    projects: string; // AI Lodge projects on smubia.com (https://www.smubia.com/projects/ailodge)
    telegram: string;
  };

  semester: Semester | null; // the current semester, or ?semester=
  past: Semester[];          // past semesters, newest first, lodges as they ran

  // Photos replaced in the CMS (Settings › Photos). null = not replaced: keep your own file.
  photos: {
    entry: { src: string; alt: string } | null;         // entry scene, desktop (entry-hd.jpg)
    entryPortrait: { src: string; alt: string } | null; // entry scene, phone (entry-hd-portrait.jpg)
    lodgeHero: { src: string; alt: string } | null;     // lodge page backdrop (close-desktop.jpg)
    moments: { src: string; alt: string }[] | null;     // the "Past moments" belt, in order
  };
};

type Semester = {
  slug: string;          // "ay2627-s1"
  name: string;          // "AY26/27 Semester 1"
  status: "current" | "past";
  hackDay: string | null;   // "Date · Venue"
  timeline: { label: string; date: string /* YYYY-MM-DD */; note?: string }[];
  projectsUrl: string;   // that semester's yearbook on smubia.com
  lodges: Lodge[];       // in the order to show them
};

type Lodge = {
  slug: string;          // "mit"
  path: string;          // ALWAYS link with this, e.g. "/lodges/mit" (see §4.5)
  name: string;          // "MIT Lodge"
  motto: string | null;  // "Mostly Intelligent Together" (shown in quotes)
  tagline: string;
  level: string;         // badge text, free text: "Open to all", "Beginner", …
  whoCanJoin: string | null; // "Anyone"
  forWho: string;
  forWhoCard: string;    // already falls back to forWho
  why: string;
  topics: string[];      // "What you'll explore"
  cardTags: string[];    // max 3, already falls back to topics.slice(0, 3)
  goals: string[];       // may be empty
  schedule: { text: string | null; short: string | null; tentative: boolean };
                         // text: "Tue or Wed evenings · 7–10pm"; short (card): "Tue · 7–10pm"
  sessionLength: string | null; // "~3 hours per session"
  weeks: { label: string; topic: string; tag: "mandatory" | "optional" | null; note: string | null }[];
  weeksNote: string | null;     // "Weekly topics are indicative and may shift to fit the lodge."
  captains: { name: string; detail: string; telegram: string; telegramUrl: string | null; image: string | null }[];
  applications: {
    status: "open" | "closed"; // open only if the lodge, its semester AND the global switch are open
    applyUrl: string | null;   // this lodge's Apply/Join target; null when closed
  };
  art: {
    logo: string | null;       // absolute URL; PNG, SVG or WebP on transparency
    accent: string;            // "#3BB9AF"
    neonColor: string;         // already falls back to accent
    ambient: "none" | "pointed" | "teardrop" | "lance" | "heart" | "round" | "maple" | "oval" | "bat";
    ambientImage: string | null; // custom drifting particle; replaces `ambient` when set
    ambientGlow: boolean;      // the pulsing halo (was Vampire-only)
    neonSign: "none" | "bat" | "guitar" | "ship"; // which coded neon sign to draw
    animatedArt: string | null; // animated SVG for the hero, replaces the logo when set
  };
};
```

All image URLs are absolute (usually `https://<id>.public.blob.vercel-storage.com/...`).

## 2. What to replace

File names are from the copy of the repo next to smubia.com, which is behind the live site
(the live site has a `/lodges/past` page, more lodges and session times). Apply the same
idea to whatever the current files are.

| Today (hard-coded) | Replace with |
|---|---|
| `src/data/lodges.ts` → `lodges` array, `getLodge`, `isClosed` | `feed.semester.lodges`; find by `slug`; closed = `applications.status === "closed"` |
| Previous lodges page (`/lodges/past`) data | `feed.past` (each has `name` for "Fall 2026 cohort"-style headings and its `lodges`) |
| `app/lodges/[slug]/page.tsx` `generateStaticParams` + `getLodge` | lodges from the feed (current + past), matched on `path` |
| `LODGE_SLUG_ALIASES` (`kag` → `curiositymaxxer`) | **Keep in the site.** Old shared links; the CMS doesn't track renamed slugs |
| `https://forms.gle/ZU3dx3i3fioxkvjv8` in `ApplyCTA.tsx` ("Join us now"), `Hero.tsx` ("Apply now"), `NavBar.tsx` ("Apply", "Apply now") | `feed.applications.url`. On a lodge page, use `lodge.applications.applyUrl`, falling back to `feed.applications.url` if you want the button to stay (it then goes to Telegram when closed). Change the label when `!feed.applications.open`, e.g. "Get notified" |
| `ApplicationsBanner.tsx` `DATES` | `feed.semester.timeline` (format `date` yourself, e.g. "05 OCT") |
| `https://smubia.com/Projects?badge=AI%20Lodge` in `MomentsBelt.tsx`, `Footer.tsx` | `feed.links.projects` (old link still redirects, but it takes 2 hops) |
| `Captain.image` `/captains/<name>.jpg` | `captain.image` (absolute URL, may be null: show initials) |
| `LodgeMark.tsx` `url(/logos/<slug>.png)` | `art.logo` |
| `lodge.neonColor ?? lodge.accent` | `art.neonColor` (already resolved) |
| `lodge.slug === "hackstreet-boys" / "vampire" / "curiositymaxxer"` checks in `LodgeCard.tsx`, `LodgeHero.tsx`, `LodgeTicker.tsx` | `art.neonSign === "guitar" / "bat" / "ship"` |
| `AmbientKind` from `lodge.ambient`, `ambientGlow` | `art.ambient` (`"none"` = no particles), `art.ambientImage` (draw this image instead of a preset when set), `art.ambientGlow` |
| `lodge.level` union + `LEVEL_STYLES[lodge.level]` | `level` is free text now ("Open to all" is common). Style known values, and give unknown ones a default style; or tint with `art.accent` |
| `forWhoCard ?? forWho`, `cardTags ?? topics.slice(0, 3)` | use the fields directly (already resolved) |
| Session time on cards / lodge hero ("Tue · 7–10pm", "Tentative") | `schedule.short` (card), `schedule.text` (hero and trail), `schedule.tentative` |
| `MOMENTS` in `MomentsBelt.tsx` | `feed.photos.moments ?? MOMENTS` (the CMS gives no width/height: size the belt items by CSS, e.g. a fixed height with `width: auto`) |
| `/entry/entry-hd.jpg`, `/entry/entry-hd-portrait.jpg` (entry scene, layout preload) | `feed.photos.entry?.src` / `feed.photos.entryPortrait?.src`, else the files. One image replaces both the `-web` and `-hd` variants |
| `/entry/close-desktop.jpg` in `LodgeHero.tsx` | `feed.photos.lodgeHero?.src`, else the file |

Programme-wide copy stays in the site for now: hero stats, Why join, How a lodge works,
the programme trail (weeks 1–7, industry workshops, recess hack day, finals) and the
three-stage application process.

## 3. Suggested implementation

- Add one module, e.g. `src/lib/cms.ts`, with `getFeed(semester?)` and the types above.
- Fetch **on the server** (server components / `generateStaticParams`), not in the browser:
  ```ts
  const res = await fetch("https://www.smubia.com/api/public/ailodge", { next: { revalidate: 60 } });
  ```
  Next 15+ does not cache `fetch` by default, so set `revalidate` (or the page's
  `export const revalidate = 60`) or every visit hits smubia.com.
- Turn `src/data/lodges.ts` into the fallback: if the fetch fails or returns no current
  lodges, render from the static data so the site never goes blank.
- Keep the visual components as they are; only their props change.

## 4. Things to watch (flagged)

1. **The CMS starts empty.** No lodges are entered yet. Switch the site over only after
   the current semester's lodges (and ideally the past ones) are in the CMS at
   smubia.com/admin (AI Lodge › semester › Lodges), or the fallback will be showing.
   Ask the smubia.com side to confirm the data is in.
2. **Logo masks across domains.** `LodgeMark` paints the logo with CSS `mask-image`.
   Masks load in CORS mode, so a logo on Vercel Blob only works if Blob sends
   `Access-Control-Allow-Origin` (it normally sends `*`; verify in the browser). If a
   mask fails it renders as nothing: fall back to an `<img>` of the logo.
3. **`next/image` hosts.** Add the Blob host to `images.remotePatterns` in
   `next.config`: `{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }`.
4. **Animated SVGs.** Render `art.animatedArt` with `<img>` (or `<object>`), never by
   inlining the SVG markup: an `<img>` SVG can't run scripts.
5. **Slugs can repeat across semesters.** Lodges keep their `/lodges/<slug>` address after
   their semester ends (the previous-lodges page links to them). If a slug comes back in a
   later semester, the newest lodge keeps `/lodges/<slug>` and the older one's `path`
   becomes `/lodges/past/<semester>/<slug>`. Always link with `path`, and add a
   `/lodges/past/[semester]/[slug]` route that renders the same lodge page (it is only
   used once a slug repeats).
6. **Applications closed.** When the switch is off, `applications.url` is the club
   Telegram and every lodge is `"closed"` with `applyUrl: null`. Don't hide lodges; the
   site already shows closed lodges "for transparency".
7. **Hidden semesters** (being prepared in the CMS) never appear in the feed; a new
   semester appears when exco makes it current, and the previous one moves to `past`.
8. **Old smubia.com links.** `https://smubia.com/Projects?...` still redirects, but use
   the URLs from `feed.links` so new links are canonical.
9. **Images may be null.** Captains without photos and lodges without logos are allowed.
10. **Don't hard-code the form URL anywhere again**; the club changes it each intake.

## 5. Asking for changes

Need a field that isn't there (e.g. programme copy)? Ask on the
smubia.com side: new fields are added to `app/lib/cms/ailodge-feed.ts` without breaking
this version.
