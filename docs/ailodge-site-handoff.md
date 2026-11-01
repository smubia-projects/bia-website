# AI Lodge site: reading everything from the smubia.com CMS

For whoever maintains the AI Lodge site (ailodge.smubia.com, repo
`makilover3000/AI-LODGE-RECRUITMENT-WEBSITE`: Next 16, React 19, Tailwind 4, GSAP).

Lodges, captains, weekly trails, the applications timeline, every lodge's art, the
Apply/Join links and the site's photos now live in the smubia.com CMS
(smubia.com/admin). The AI Lodge site reads them from one public endpoint. That switch
is built and tested on the branch **`cms-feed`** of the AI Lodge repo; this document
explains it so it can be reviewed and merged.

The two sites will become one repo later. Until then this endpoint is the contract.

## 1. What changed on `cms-feed`

- `src/lib/cms.ts` fetches the feed on the server, maps it onto the site's `Lodge` shape
  and exposes `getSite()`, `allLodges()`, `lodgeAt(path)` and `renamedLodge(slug)`.
- `src/data/lodges.ts` and `src/data/programme.ts` are **deleted**. Nothing about lodges,
  dates or links is hard-coded any more.
- Lodge art is chosen in the CMS, not by slug:
  - **Header art** (`art.hero.kind`): the logo, the lodge's neon sign, a coded showpiece
    (Despacito, BRYan, PandAI, S.P.I.C.E. — any lodge can reuse one), a **custom
    showpiece** built in the CMS (`components/lodge/CustomShowpiece.tsx`: uploaded image,
    glow colour, particles, float and parallax), or an animated SVG.
  - **Neon sign** (`art.neonSign`: guitar, ship, bat, skull) is the card mark and the strip
    mark when set (`components/lodge/NeonMark.tsx` holds each sign's tuned sizes).
  - **Strip under the header** (`art.belt`): repeat the mark, repeat an uploaded image,
    scroll one long uploaded image, papel picado, or none; speed and size.
  - **Logo style**: painted in the glow colour (the mask trick) or in its own colours
    (`.ail-art` in `globals.css`).
  - **Drifting particles** (`AmbientLayer`) now render when a lodge has them set,
    including a custom particle image. Every lodge is set to none today, matching the
    live site.
- Placeholder lodges, "details drop …", the past cohort's name ("Fall 2026"), the
  applications timeline (with its deadline flag) and the trail's tentative flag all come
  from the CMS.
- Photos replaced in the CMS (entry scene, lodge page backdrop, home photo, Why join
  photo, moments belt) are used; otherwise the site's own files are.
- Apply buttons follow the CMS switch: the form while applications are open, the club
  Telegram ("Get notified") while closed.
- Routes: `/lodges/[slug]`, plus `/lodges/past/[semester]/[slug]` for an older lodge whose
  URL name a later semester reused. Old URL names set in the CMS redirect (308), e.g.
  `/lodges/kag` → `/lodges/curiositymaxxer`.
- `POST /api/revalidate` (Bearer `REVALIDATE_SECRET`) refreshes every page at once.
- `next.config.ts`: Blob and smubia.com image hosts, and `turbopack.root` so a copy
  checked out inside the smubia.com repo builds on its own.

Checked locally against the CMS: all 16 lodge pages match the live site's structure
(heading, badges, header art, watermark, strip, captains, weeks, closing band), the home
page text is identical, a CMS edit shows on the site within 2 seconds, and every new art
option renders.

## 2. Deploying

On the **AI Lodge** Vercel project:

| Variable | Value |
|---|---|
| `REVALIDATE_SECRET` | A long random string (`openssl rand -hex 32`) |
| `CMS_FEED_URL` | Optional; defaults to `https://www.smubia.com/api/public/ailodge` |

On the **smubia.com** Vercel project:

| Variable | Value |
|---|---|
| `AILODGE_REVALIDATE_URL` | `https://ailodge.smubia.com/api/revalidate` |
| `AILODGE_REVALIDATE_SECRET` | The same value as `REVALIDATE_SECRET` above |

Order: deploy the smubia.com CMS (feed version 2) first, then merge `cms-feed`. The AI
Lodge build fetches the feed, so it fails if smubia.com isn't serving version 2 yet.
After that, pages are static: they refresh at once when the CMS calls the revalidate
route, and hourly regardless. If smubia.com is down during a refresh, the last good
pages stay up.

Local development: copy `.env.example` to `.env.local` and point `CMS_FEED_URL` at a local
smubia.com (`http://localhost:3000/api/public/ailodge`).

## 3. The endpoint

```
GET https://www.smubia.com/api/public/ailodge
GET https://www.smubia.com/api/public/ailodge?semester=ay2627-s1
```

- Public, read-only, CORS `*`. Not cached at the edge (`no-store`); the CMS caches its
  own reads and busts them on every edit.
- `?semester=<slug>` returns that semester as `semester` (404 if it isn't public).
- 503 with `{ "error": "…" }` if the database is unreachable.
- `version` is bumped only when a field is renamed or removed. **Version 2** (this one)
  replaced `art.animatedArt` with `art.hero`, and added `art.belt`, `art.logoStyle`,
  `art.emblem`, `art.watermark`, `placeholder`, `trailTentative`, `oldSlugs`,
  `applications.takesApplications`, `semester.shortName`, `semester.revealNote`, timeline
  `deadline`, and the `hero` and `whyJoin` photos. The exact types are in
  `app/lib/cms/ailodge-feed.ts` (smubia.com repo) and mirrored in `src/lib/cms.ts`.

## 4. Things to watch

1. **New header art or signs need code.** The four showpieces and four neon signs are
   coded on this site. A new coded one needs a value added on both sides
   (`LODGE_SHOWPIECES` / `LODGE_NEON_SIGNS` in the CMS taxonomy, then the component
   here). For a one-off look without code, use the custom showpiece.
2. **Logo masks across domains.** `LodgeMark` paints logos with CSS `mask-image`, which
   loads in CORS mode. Vercel Blob sends `Access-Control-Allow-Origin: *` (checked), so
   CMS-hosted logos work.
3. **Moments belt sizes.** Photos replaced in the CMS come without dimensions, so they
   show at 4:3, cropped to fill.
4. **Entry scene.** A replaced entry painting keeps the window glow, smoke and sun
   positions tuned to the original painting.
5. **Applications closed.** Every Apply button goes to the club Telegram and lodges show
   as not open; lodges are never hidden.
6. **Hidden semesters** never appear; a semester appears when exco makes it current, and
   the previous one moves to `past`.

## 5. Asking for changes

Need a field that isn't there (programme copy, hero stats, …)? Ask on the smubia.com
side: new fields are added to `app/lib/cms/ailodge-feed.ts` without breaking version 2.
