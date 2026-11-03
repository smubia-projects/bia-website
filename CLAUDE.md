# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

**Setup:**
```powershell
npm install
npm run dev      # Start development server on http://localhost:3000
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Project Overview

SMUBIA (Singapore Management University Business Intelligence & Analytics Club) website built with Next.js 16. The site showcases the club's mission, vision, curriculum, and community.

**Key Technologies:**
- **Framework:** Next.js 16 (App Router, Turbopack) with React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS + CSS Modules, design tokens as CSS variables in `app/globals.css`
- **Fonts:** Bricolage Grotesque (display, `--font-display`), Inter (body, `--font-inter`), Roboto Mono (eyebrows/stats, `--font-roboto-mono`) via `next/font/google`
- **UI Components:** our own primitives in `app/components/ui/`, Lucide icons, Framer Motion
- **Hosting:** Vercel (www.smubia.com)
- **Analytics:** Vercel Analytics and Speed Insights

**Design system ("light base, dark pine anchors")** — full reference in [DESIGN.md](DESIGN.md), read it before any styling work:
- Light sections: `--bg #F6FAF8`, white cards, ink text `--ink #12352C`
- Dark anchor sections (home hero, DAP bands, footer): `--pine-deep #0C211C` — never pure black
- Brand mint `--mint #7DD7C2` is used on dark backgrounds only (fails contrast on white); on light backgrounds use `--emerald #0E7C5B`
- Shadows/radius scales are tokens (`--shadow-*`, `--radius-*`); all mapped into Tailwind in the `@theme` block of `app/globals.css`
- Photos are edited in the CMS under **Settings › Photos**. Every static photo is a slot in `app/lib/photos.ts` (the shipped file is the default); read it with `getSitePhotos()` + `pickPhoto()` (server) or `usePhoto()` (client) and put `data-photo-slot="<key>"` on the `<Image>` so the CMS preview can swap it. Never hard-code a new site photo: add a slot.
- Club URLs (application forms, Telegram, emails, prospectus, socials) and the "applications open" switches are edited in the CMS under **Settings › Site links**. Join buttons use `joinLink()`. Read them with `getSiteLinks()` (server) or `useSiteLinks()` (client); `app/lib/links.ts` holds the defaults. Never hard-code a join link.

## Project Architecture

### Directory Structure

```
app/
├── components/          # Reusable React components
│   ├── ui/             # Shared primitives: Button, SectionHeading, ScrollReveal, CountUp, RotatingWord
│   ├── nav.tsx         # Fixed glassy navbar (Projects dropdown, custom mobile menu, active links)
│   ├── footer.tsx      # Dark pine footer (links, contact, socials)
│   ├── loadingscreen.tsx
│   ├── ProjectCard.tsx # Project card for showcase grid
│   ├── carousel.tsx    # Alumni testimonial cards (home page)
├── lib/
│   ├── cms/            # CMS service layer (projects, cohorts, newsletter, people, telegram, uploads)
│   ├── db/             # Drizzle schema + Neon/PGlite client
│   ├── links.ts        # Club URL defaults + the list of CMS-editable links (read them with getSiteLinks/useSiteLinks)
│   └── projects.ts     # Re-exports the public project reads from lib/cms
├── admin/              # CMS: (cms)/ route group behind Google sign-in, login/, actions.ts
├── api/                # auth (Auth.js), mcp (Claude tools), cron/publish
├── projects/
│   ├── data/types.ts   # Project & TeamMember interfaces
│   ├── page.tsx        # All projects (ISR 1h) + ProjectsExplorer (search, filter sidebar, wall/cards)
│   ├── ailodge/        # AI Lodge yearbook: [cohort]/ semester pages, [cohort]/[slug]/ project pages
│   ├── dap/            # DAP yearbook: [cohort]/ cohort pages, [cohort]/[slug]/ project pages
│   ├── _detail/        # Shared project detail page (used by AI Lodge and DAP project routes)
│   └── [slug]/         # Old /projects/<slug> links: "projects have moved" page
├── dap/                # DAP recruitment page (data.ts) + [cohort]/ run page (newsletter, schedule, groups) + [cohort]/[issue]/ issues
├── work-with-us/       # Sponsorship page (tiers/benefits/events in data.ts, from prospectus)
├── curriculum/         # Curriculum page — workshops roadmap (Monopoly-themed SVG board)
│   └── datathonData.ts # Datathon stats/copy (retained, unused since Wave 3)
├── contact-us/         # Join CTAs (#join anchor), channels, address
├── ailodge/            # Old internal AI Lodge page; unreachable (/ailodge redirects to the infosite)
├── layout.tsx          # Root layout: fonts, metadata, Navbar/Footer/LoadingScreen
├── page.tsx            # Home: dark hero, offerings, stats, DAP band, testimonials, join CTA
└── globals.css         # Tailwind + design tokens (CSS variables)

public/
├── images/             # Static images (logo is white-on-transparent; nav tints it via CSS filter)

next.config.mjs         # Config for remote image domains
```

### Page Structure

**Root Layout** (`app/layout.tsx`):
- Loads fonts (Bricolage Grotesque, Inter, Roboto Mono) via `next/font/google`
- Wraps all pages with Navbar and Footer (pages must clear the fixed 4rem nav themselves, e.g. `padding-top`)
- Includes Vercel Analytics and Speed Insights

**Pages** (Next.js App Router):
- Each page directory has a `page.tsx` file
- Use "use client" directive if the page needs interactivity
- Pages inherit layout structure automatically

### Styling Conventions

1. **CSS Modules** (preferred for component-scoped styles):
   - One `.module.css` file per component
   - Import as `import styles from "./component.module.css"`
   - Use `className={styles.className}`

2. **Tailwind CSS** (for utility classes):
   - Tailwind 4: the theme lives in the `@theme` block of `app/globals.css` (no `tailwind.config.ts`)
   - Content paths configured for `./app/**/*.{js,ts,jsx,tsx,mdx}`
   - Theme colors map to the CSS-variable tokens (`bg`, `surface`, `ink`, `pine`, `mint`, `emerald`, …)

3. **Global Styles**:
   - `app/globals.css` - imported in root layout; defines all design tokens, `.eyebrow`, `.glow-mint`, `float` keyframes
   - Bootstrap has been fully removed — do not reintroduce it

## Component Patterns

### Client Components
When a component needs interactivity (state, effects, event handlers), add `"use client"` at the top:
```tsx
"use client";
import { useState } from "react";
```

### Image Handling
- Use Next.js `Image` component for optimization
- Remote images from two sources:
  - **Vercel Blob:** `ssvs8thfuktvqsqk.public.blob.vercel-storage.com`
  - **AWS S3:** `thisisformygif.s3.ap-southeast-2.amazonaws.com` and `thisisformygif2.s3.ap-southeast-1.amazonaws.com`
- Both configured in `next.config.mjs` under `remotePatterns`

### Scroll Reveal Pattern
The home page (`app/page.tsx`) demonstrates a custom `ScrollReveal` component using IntersectionObserver for lazy animations. This pattern is used to animate sections as they enter the viewport.

### Client-only values
Don't `setState` inside an effect to read browser-only values (React 19 lint forbids it).
Use `useHydrated`, `useMediaQuery` or `useClientValue` from `app/components/ui/useClient.ts`.

## Image and Asset Management

- **Local images:** placed in `public/images/`
- **Remote images:** stored on Vercel Blob or AWS S3
- Image domains configured in `next.config.mjs` - add new domains there if adding remote image sources
- Use Next.js `Image` component with `width={0} height={0} sizes="100vw"` for responsive remote images

## Content Data & CMS (`/admin`)

### Where content lives
- **Neon Postgres** (Drizzle ORM) holds all CMS content: `projects`, `cohorts` (AI Lodge
  semesters + DAP cohorts), `tracks` (Hack Day tracks), `lodges` (AI Lodge lodges, served to
  ailodge.smubia.com), `dap_groups` (DAP co-learning groups with members and mentors), `people`
  (CMS access + roles), `sessions` (DAP co-learning schedule, each linked to a group), `issues` ("This week in DAP"), `site_links` (club links), `site_settings` (switches such as applications open) and `site_photos` (replaced photos). Schema: `app/lib/db/schema.ts`;
  SQL migrations in `drizzle/` (generate with `npm run db:generate` after editing the schema).
- **Local development needs no database account**: without `DATABASE_URL`, `app/lib/db`
  uses an embedded PGlite database in `.data/pglite`, migrated on first use. It is
  single-process: stop `npm run dev` before running a script against it, and never open it
  from `generateStaticParams` (those run in worker processes).
- Images stay on **Vercel Blob** (or `public/uploads/` locally without a Blob token).
- **Upstash Redis is no longer used by this site.** It still backs the rate limiter for the
  deployed student projects (see `../bia-all-projects`).

### Service layer
`app/lib/cms/*` is the only place that reads or writes content. The admin server actions
(`app/admin/actions.ts`), the MCP endpoint (`app/api/mcp/route.ts`) and the cron route all
call it, so validation, permissions (`actor.ts`), the one-winner-per-track rule and cache
revalidation (`revalidate.ts`, tags `projects` / `cohorts` / `newsletter`) apply everywhere.
Public pages read through `unstable_cache` with those tags (ISR 1h, busted on every change).

### CMS
- Sign-in: Auth.js (`auth.ts`) with Google, `@smu.edu.sg` accounts only, plus the email must
  be on the People list (or in `CMS_BOOTSTRAP_ADMINS`). Roles are re-read from the database
  on every request. Local dev also has a dev sign-in with a role picker (never in production).
- Roles: **Exco admin** (everything), **DAP exco** (DAP only: cohorts, groups, schedule,
  newsletter, DAP projects) and **AI Lodge exco** (AI Lodge only: semesters, tracks, lodges,
  Hack Day winners, AI Lodge projects). Programme exco can't publish projects (an exco admin
  approves them), edit Site links or manage people. Permissions live in `can` (`actor.ts`),
  the role → programme map in `ROLE_PROGRAMME` (`taxonomy.ts`). There is no lodge head role.
- Project status: `draft` → `in_review` → `published` (replaces the Redis-era `hidden` flag;
  `Project.hidden` is now derived). Exco approves. A project needs a semester (AI Lodge) or
  cohort (DAP) before it can be published, because its page lives under it. Each AI Lodge
  track has at most one **Hack Day winner** (gold glow + medal, shown in the yearbook only).
- AI Lodge has two separate groupings per semester: **Hack Day tracks** (yearbook shelves, one
  winner each) and **lodges** (who taught the team). A project has one of each. Tracks and the
  applications timeline are on the semester's **Overview**; its **Projects** page adds projects,
  moves them between tracks, sets lodges and marks winners.
- **Lodges** (a semester's Lodges page) hold everything ailodge.smubia.com shows: copy, captains
  (lodge heads), weekly trail, schedule, per-lodge application status and art (logo, colours,
  particles, neon sign, animated SVG). They are a new record each semester (copy one forward);
  a past semester's lodges stay as they ran. Service: `app/lib/cms/lodges.ts`.
- **Public AI Lodge feed**: `GET /api/public/ailodge[?semester=<slug>]`, unauthenticated and
  read-only, built in `app/lib/cms/ailodge-feed.ts`. The AI Lodge site reads it; the contract
  and migration notes for that site are in [docs/ailodge-site-handoff.md](docs/ailodge-site-handoff.md).
  Bump `FEED_VERSION` before renaming or removing a field. Lodge links on smubia.com use each
  lodge's `path` from `lodgePaths()` (`/lodges/<slug>`, or `/lodges/past/<semester>/<slug>` when a
  later semester reuses the slug).
- The CMS is organised by run, like Vercel projects: a switcher at the top of the sidebar picks an
  AI Lodge semester or DAP cohort, and the run is in the path (`/admin/ailodge/<semester>[/projects]`,
  `/admin/dap/<cohort>[/groups|/schedule|/newsletter|/projects]`; new runs at `/admin/<programme>/new`).
  Dashboard, All Projects, Site Links and People stay outside the switcher. Path helpers:
  `app/admin/_components/runs.ts`. The cohort slug `new` is reserved.
- DAP **Co-learning groups** (a cohort's Co-learning groups page): the groups that teach sessions,
  with members and 1–3 mentors (name, optional photo, LinkedIn, email, Telegram). The schedule picks
  the group teaching each week; groups show on the cohort's run page and the newsletter issues.
  Project groups are different people and aren't stored here: each is a project's `team`.
- Newsletter: publish now, or schedule a date; the daily Vercel Cron
  (`vercel.json`, 01:00 UTC = 09:00 SGT, ±1 h on Hobby) publishes due issues. Publishing can
  post once to the DAP Telegram channel; "Send test" sends to one Telegram user ID (they must
  have sent /start to the bot). The bot is outbound-only: no webhook.
- MCP: `/api/mcp` exposes the CMS as tools for Claude. Each person creates a personal access
  token under **Settings › Access tokens** (`app/lib/cms/tokens.ts`, stored hashed); the MCP acts
  as that person with their current role. Locally (dev sign-in on) it also works without a token, as exco.
- AI Lodge site refresh: after any change to lodges, semesters, links or photos, the CMS calls
  `AILODGE_REVALIDATE_URL` with `AILODGE_REVALIDATE_SECRET` (`app/lib/cms/revalidate.ts`), and the
  AI Lodge site rebuilds from the feed at once (it also refreshes hourly).

### URLs
All paths are lower-case and kebab-case (`/work-with-us`, `/contact-us`); folder names under
`app/` match. Old forms (capitals, `/WorkWithUs`, `/workwithus`) redirect in `proxy.ts`.

- `/projects` (all projects), `/projects/ailodge` (the live semester once it has projects, until then the
  newest semester that has some), `/projects/ailodge/<semester>`
- `/projects/dap` (current cohort's yearbook), `/projects/dap/<cohort>`
- Project pages: `/projects/ailodge/<semester>/<slug>` and `/projects/dap/<cohort>/<slug>`.
  Build links with `projectPath()` / `cohortPath()` / `dapRunPath()` / `issuePath()` from
  `app/lib/cms/paths.ts`. A project moved to another semester redirects from its old address.
- `/dap` (recruitment page), `/dap/<cohort>` (the run: latest issue, schedule, groups),
  `/dap/<cohort>/week-<n>` (an issue)
- `/work-with-us`, `/contact-us`, `/curriculum`
- Legacy `/Projects?badge=…`, `/projects/ai-lodge` and any path with capitals
  redirect in `proxy.ts` (mapping in `app/lib/canonical-path.ts`). Old project links
  (`/projects/<slug>`) show a "projects have moved" page.
- Project slugs `ailodge`, `ai-lodge`, `dap`, `new` stay reserved.
- CMS previews (any status, signed in): `/admin/preview/project/<slug>`, `/admin/preview/cohort/<id>`.

### Environment variables
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon connection string, set by hand per Vercel environment (no Vercel ↔ Neon integration). Unset locally = PGlite |
| `AUTH_SECRET` | Auth.js session secret (`npx auth secret`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth client for CMS sign-in |
| `CMS_BOOTSTRAP_ADMINS` | Comma-separated emails with exco access before anyone is on the People list |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob uploads |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_USERNAME` | Club bot (unset = messages are logged, not sent) |
| `TELEGRAM_DAP_CHANNEL_ID` | Where published issues are posted (`@channel` or `-100…`) |
| `CRON_SECRET` | Authenticates the Vercel Cron call to `/api/cron/publish` |
| `AILODGE_REVALIDATE_URL` | The AI Lodge site's revalidate route, e.g. `https://ailodge.smubia.com/api/revalidate` (unset = it refreshes hourly) |
| `AILODGE_REVALIDATE_SECRET` | Shared secret for that route; the same value is set on the AI Lodge site |
| `NEXT_PUBLIC_SITE_URL` | Absolute links in Telegram posts (default `https://www.smubia.com`) |

### Scripts
- `npm run db:migrate`: apply migrations (runs automatically on Vercel via `vercel-build`)
- `npm run db:import-redis [-- --commit] [--overwrite]`: the one-off, re-runnable import of the
  Redis-era projects. It is the only data script allowed: content changes go through `/admin`
  or the MCP tools, not seed scripts.

Full setup and cutover checklist: [docs/cms-setup.md](docs/cms-setup.md).

## Common Development Tasks

### Adding a New Page
1. Create directory: `app/YourPage/`
2. Create `page.tsx` inside
3. Add "use client" if component needs interactivity
4. Page automatically appears at `/yourpage` route
5. Import components as needed

### Adding a New Component
1. Create file in `app/components/ComponentName.tsx`
2. If using styled CSS, create `app/components/ComponentName.module.css`
3. Import in page or other components

### Working with Forms
- Look at `contact-us/page.tsx` for form patterns

## Vercel Integration

- **Analytics:** `@vercel/analytics/react` imported in layout
- **Speed Insights:** `@vercel/speed-insights/next` imported in layout
- **Blob Storage:** Used for hosting images and PDFs (CDN)
- **Neon Postgres:** CMS content (our own Neon project, attached with `DATABASE_URL`)
- **Vercel Cron:** daily newsletter publishing (`vercel.json`)
- **Deployment:** Automatic on push to main branch

## URL Paths

**Never remove a public URL path. Redirect it instead.** Old links live on in Telegram posts, the
AI Lodge infosite, Instagram and sponsor decks. This covers query deep links
(`/Projects?badge=DAP`, `/Projects?badge=AI%20Lodge`) and the pre-2026 capitalised paths
(`/DAP`, `/Projects`, `/WorkWithUs`, `/ContactUs`, `/Curriculum`).
When a page moves or is retired, add its redirect in the same change.

One agreed exception: the pre-CMS project pages (`/Projects/<slug>`) are not redirected to the
project. They show a "projects have moved" page (`app/projects/[slug]`) with links to the new locations.

- Case and renamed-path redirects go in `proxy.ts` / `app/lib/canonical-path.ts`. Its
  matcher only fires on paths with a capital letter (plus a few listed old forms), so normal
  visits never run the proxy. `next.config.mjs` redirect sources match case-insensitively, so
  a `/DAP` → `/dap` rule there loops forever.
- Cross-domain and other simple redirects can live in `next.config.mjs`.

## Notes for Future Development

- The project uses both CSS Modules and Tailwind CSS - maintain this duality for consistency
- Build new UI with the shared primitives in `app/components/ui/` and the design tokens
- Remote image hosting (Vercel Blob/S3) allows for dynamic content without rebuilds
- All pages use the root layout structure (Navbar, Footer, SocialDots) - keep this consistent
- Path alias `@/*` maps to repository root, enabling cleaner imports
