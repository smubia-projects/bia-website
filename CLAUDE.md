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

SMUBIA (Singapore Management University Business Intelligence & Analytics Club) website built with Next.js 14. The site showcases the club's mission, vision, curriculum, and community.

**Key Technologies:**
- **Framework:** Next.js 14 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS + CSS Modules, design tokens as CSS variables in `app/globals.css`
- **Fonts:** Bricolage Grotesque (display, `--font-display`), Inter (body, `--font-inter`), Roboto Mono (eyebrows/stats, `--font-roboto-mono`) via `next/font/google`
- **UI Components:** NextUI (CustomModal only), React Icons, Lucide Icons, Swiper
- **Hosting:** Vercel (www.smubia.com)
- **Analytics:** Vercel Analytics and Speed Insights

**Design system ("light base, dark pine anchors")** — full reference in [DESIGN.md](DESIGN.md), read it before any styling work:
- Light sections: `--bg #F6FAF8`, white cards, ink text `--ink #12352C`
- Dark anchor sections (home hero, DAP bands, footer): `--pine-deep #0C211C` — never pure black
- Brand mint `--mint #7DD7C2` is used on dark backgrounds only (fails contrast on white); on light backgrounds use `--emerald #0E7C5B`
- Shadows/radius scales are tokens (`--shadow-*`, `--radius-*`); all mapped into Tailwind via `tailwind.config.ts`
- Club URLs (Join DAP, Join AI Lodge, Telegram, socials) are edited in the CMS under **Settings › Site links**. Read them with `getSiteLinks()` (server) or `useSiteLinks()` (client); `app/lib/links.ts` holds the defaults. Never hard-code a join link.

## Project Architecture

### Directory Structure

```
app/
├── components/          # Reusable React components
│   ├── ui/             # Shared primitives: Button, SectionHeading, ScrollReveal, CountUp, RotatingWord
│   ├── nav.tsx         # Fixed glassy navbar (custom mobile menu, active links)
│   ├── footer.tsx      # Dark pine footer (links, contact, socials)
│   ├── loadingscreen.tsx
│   ├── ProjectCard.tsx # Project card for showcase grid
│   ├── carousel.tsx    # Alumni testimonial cards (home page)
│   ├── Wordcard.tsx + CustomModal.tsx  # Image card with modal details (workshops)
│   └── Timelines/      # TimelineMain (event data) + Timeline (Swiper cards)
├── lib/
│   ├── cms/            # CMS service layer (projects, cohorts, newsletter, people, telegram, uploads)
│   ├── db/             # Drizzle schema + Neon/PGlite client
│   ├── links.ts        # Club URL defaults + the list of CMS-editable links (read them with getSiteLinks/useSiteLinks)
│   └── projects.ts     # Re-exports the public project reads from lib/cms
├── admin/              # CMS: (cms)/ route group behind Google sign-in, login/, actions.ts
├── api/                # auth (Auth.js), mcp (Claude tools), cron/publish
├── Projects/
│   ├── data/types.ts   # Project & TeamMember interfaces
│   ├── page.tsx        # All projects (ISR 1h) + ProjectsExplorer (search, facets, wall/cards)
│   ├── ai-lodge/       # AI Lodge yearbook: [cohort]/ semester pages, [cohort]/[slug]/ project pages
│   ├── _detail/        # Shared project detail page (used by AI Lodge and DAP project routes)
│   └── [slug]/         # Old /Projects/<slug> links: "projects have moved" page
├── DAP/                # DAP recruitment page (data.ts) + newsletter/ + projects/ (yearbook, [cohort]/[slug] project pages)
├── WorkWithUs/         # Sponsorship page (tiers/benefits/events in data.ts, from prospectus)
├── Curriculum/         # Curriculum page — workshops roadmap (Monopoly-themed SVG board)
│   └── datathonData.ts # Datathon stats/copy (retained, unused since Wave 3)
├── Events/page.tsx     # Redirects to /Curriculum (route kept for old links)
├── WhatWeDo/page.tsx   # Redirects to /Curriculum (route kept for old links)
├── Datathon/page.tsx   # Redirects to /Curriculum (route kept for old links)
├── ContactUs/page.tsx  # Join CTAs (#join anchor), channels, address
├── Merchandise/page.tsx # Placeholder (not in nav)
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
   - Tailwind config located in `tailwind.config.ts`
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

### Modal/Overlay Usage
- `CustomModal.tsx` and `Overlay.tsx` exist for modal interactions
- Modal content typically rendered into a `#portal` div defined in root layout

## Image and Asset Management

- **Local images:** placed in `public/images/`
- **Remote images:** stored on Vercel Blob or AWS S3
- Image domains configured in `next.config.mjs` - add new domains there if adding remote image sources
- Use Next.js `Image` component with `width={0} height={0} sizes="100vw"` for responsive remote images

## Content Data & CMS (`/admin`)

### Where content lives
- **Neon Postgres** (Drizzle ORM) holds all CMS content: `projects`, `cohorts` (AI Lodge
  semesters + DAP cohorts), `tracks`, `people` (CMS access + roles), `sessions` (DAP
  co-learning schedule), `issues` ("This week in DAP") and `site_links` (club links). Schema: `app/lib/db/schema.ts`;
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
- Roles: **exco** (everything), **lodge head** (own track's projects; submits for review),
  **DAP editor** (newsletter, sessions, DAP projects).
- Project status: `draft` → `in_review` → `published` (replaces the Redis-era `hidden` flag;
  `Project.hidden` is now derived). Exco approves. A project needs a semester (AI Lodge) or
  cohort (DAP) before it can be published, because its page lives under it. Each AI Lodge
  track has at most one **Hack Day winner** (gold glow + medal, shown in the yearbook only).
- Projects are placed into a semester and track from **AI Lodge › Semesters** (or **DAP ›
  Cohorts**): add existing projects, start new ones in a track, move them, mark the winner.
- Newsletter: publish now, or schedule a date; the daily Vercel Cron
  (`vercel.json`, 01:00 UTC = 09:00 SGT, ±1 h on Hobby) publishes due issues. Publishing can
  post once to the DAP Telegram channel; "Send test" sends to one Telegram user ID (they must
  have sent /start to the bot). The bot is outbound-only: no webhook.
- MCP: `/api/mcp` exposes the CMS as tools for Claude (bearer `CMS_MCP_TOKEN`).

### URLs
- `/Projects` (all projects), `/Projects/ai-lodge` (current semester), `/Projects/ai-lodge/<semester>`
- Project pages: `/Projects/ai-lodge/<semester>/<slug>` and `/DAP/projects/<cohort>/<slug>`.
  Build links with `projectPath()` / `cohortPath()` from `app/lib/cms/paths.ts`. A project
  moved to another semester redirects from its old address.
- `/DAP` (recruitment page, unchanged), `/DAP/newsletter[/<cohort>-week-<n>]`,
  `/DAP/projects[/<cohort>]`
- Legacy `/Projects?badge=…`, `/Projects/dap`, `/Projects/ailodge` and case variants redirect
  in `middleware.ts`. Old `/Projects/<slug>` links show a "projects have moved" page.
- Project slugs `ai-lodge`, `dap`, `new` stay reserved.

### Environment variables
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon connection string (set by the Vercel ↔ Neon integration). Unset locally = PGlite |
| `AUTH_SECRET` | Auth.js session secret (`npx auth secret`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth client for CMS sign-in |
| `CMS_BOOTSTRAP_ADMINS` | Comma-separated emails with exco access before anyone is on the People list |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob uploads |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_USERNAME` | Club bot (unset = messages are logged, not sent) |
| `TELEGRAM_DAP_CHANNEL_ID` | Where published issues are posted (`@channel` or `-100…`) |
| `CRON_SECRET` | Authenticates the Vercel Cron call to `/api/cron/publish` |
| `CMS_MCP_TOKEN` | Bearer token for `/api/mcp` (unset locally = open on localhost only) |
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

### Working with Forms and Modals
- Look at `ContactUs/page.tsx` for form patterns
- Use `CustomModal.tsx` for modal content
- Use `react-modal` library for modal structure

### Timeline Components
The `Timelines/` folder contains multiple timeline variants:
- `TimelineMain.tsx` - Entry point
- `TimelineDesktop.tsx` / `TimelineMobile.tsx` - Responsive variants
- Use `react-responsive` to conditionally render based on screen size

## Vercel Integration

- **Analytics:** `@vercel/analytics/react` imported in layout
- **Speed Insights:** `@vercel/speed-insights/next` imported in layout
- **Blob Storage:** Used for hosting images and PDFs (CDN)
- **Neon Postgres:** CMS content (via the Vercel Marketplace integration)
- **Vercel Cron:** daily newsletter publishing (`vercel.json`)
- **Deployment:** Automatic on push to main branch

## URL Paths

**Never remove a public URL path. Redirect it instead.** Old links live on in Telegram posts, the
AI Lodge infosite, Instagram and sponsor decks. This covers query deep links
(`/Projects?badge=DAP`, `/Projects?badge=AI%20Lodge`) and case variants (`/dap`, `/ailodge`).
When a page moves or is retired, add its redirect in the same change.

One agreed exception: the pre-CMS project pages (`/Projects/<slug>`) are not redirected. They
show a "projects have moved" page (`app/Projects/[slug]`) with links to the new locations.

- Case-variant redirects go in `middleware.ts`. `next.config.mjs` redirect sources match
  case-insensitively, so a `/dap` → `/DAP` rule there loops forever.
- Cross-domain and other simple redirects can live in `next.config.mjs`.

## Notes for Future Development

- The project uses both CSS Modules and Tailwind CSS - maintain this duality for consistency
- Build new UI with the shared primitives in `app/components/ui/` and the design tokens; NextUI remains only for `CustomModal`
- Remote image hosting (Vercel Blob/S3) allows for dynamic content without rebuilds
- All pages use the root layout structure (Navbar, Footer, SocialDots) - keep this consistent
- Path alias `@/*` maps to repository root, enabling cleaner imports
