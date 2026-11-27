# AGENTS.md

Guidance for coding agents (Claude Code, Codex and others) and people working in this repository.
It is the only instructions file: there is no CLAUDE.md.

## Quick Start

**Setup:**
```powershell
npm install
npm run dev      # Start development server on http://localhost:3000
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
npm test         # Unit and integration tests (node:test via tsx, throwaway PGlite databases)
```

## Project Overview

SMUBIA (Singapore Management University Business Intelligence & Analytics Club) website built with Next.js 16. The site showcases the club's mission, vision, curriculum, and community.

**Key Technologies:**
- **Framework:** Next.js 16 (App Router, Turbopack) with React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS + CSS Modules, design tokens as CSS variables in `src/app/globals.css`
- **Fonts:** Bricolage Grotesque (display, `--font-display`), Inter (body, `--font-inter`), Roboto Mono (eyebrows/stats, `--font-roboto-mono`) via `next/font/google`
- **UI Components:** our own primitives in `src/components/ui/`, Lucide icons, Framer Motion
- **Hosting:** Vercel (www.smubia.com)
- **Analytics:** Vercel Analytics and Speed Insights

**Design system ("light base, dark pine anchors")** — full reference in [DESIGN.md](DESIGN.md), read it before any styling work:
- Light sections: `--bg #F6FAF8`, white cards, ink text `--ink #12352C`
- Dark anchor sections (home hero, DAP bands, footer): `--pine-deep #0C211C` — never pure black
- Brand mint `--mint #7DD7C2` is used on dark backgrounds only (fails contrast on white); on light backgrounds use `--emerald #0E7C5B`
- Shadows/radius scales are tokens (`--shadow-*`, `--radius-*`); all mapped into Tailwind in the `@theme` block of `src/app/globals.css`
- Photos are edited in the CMS under **Settings › Photos**. Every static photo is a slot in `src/shared/photos.ts` (the shipped file is the default); read it with `getSitePhotos()` + `pickPhoto()` (server) or `usePhoto()` (client) and put `data-photo-slot="<key>"` on the `<Image>` so the CMS preview can swap it. Never hard-code a new site photo: add a slot.
- Club URLs (application forms, Telegram, emails, prospectus, socials) and the "applications open" switches are edited in the CMS under **Settings › Site links**. Join buttons use `joinLink()`. Read them with `getSiteLinks()` (server) or `useSiteLinks()` (client); `src/shared/links.ts` holds the defaults. Never hard-code a join link.

## Project Architecture

### Directory Structure

Everything lives under `src/` (alias `@/*` -> `./src/*`). `src/app` holds routes only; the
backend is `src/server`, code safe in both server and browser is `src/shared`, and shared UI is
`src/components`. Dependency direction: `app` -> `components` / `server` / `shared`;
`server/<feature>` -> `server/core`, `server/integrations`, `server/db`, `shared`; integrations
never import features; `shared` imports nothing from `server`. No `index.ts` re-export files.
Every `src/server` module starts with `import "server-only"` (except `db/`, which scripts and
drizzle-kit also load), so a client component that imports one fails the build. Imports use the
`@/` alias; only same-folder imports are relative (`./x`). Tests reach their helpers with `@tests/*`.

```
src/
├── app/                    # ROUTES ONLY: pages, layouts, route handlers, route-local UI and data.ts files
│   ├── layout.tsx  page.tsx  template.tsx  globals.css
│   ├── projects/           # All projects + ProjectsExplorer; ailodge/ and dap/ yearbooks; _detail/; [slug]/ "projects have moved"
│   ├── dap/                # DAP recruitment page (data.ts) + [cohort]/ run page + [cohort]/[issue]/ issues
│   ├── work-with-us/  curriculum/  contact-us/  mini-app/
│   ├── admin/              # CMS: (cms)/ route group behind Google sign-in, login/, preview/
│   │   ├── _components/    # CMS shell, ui.tsx, RunSwitcher, runs.ts (path helpers)
│   │   └── actions/        # server actions, one file per feature; run.ts has the shared run() and refreshAdmin()
│   └── api/                # auth, mcp (thin: src/server/mcp), cron/daily, telegram/webhook, mini-app, public/ailodge
├── components/
│   ├── ui/                 # primitives: Button, SectionHeading, ScrollReveal, CountUp, RotatingWord, Motion*, useClient
│   ├── site/               # nav, footer, SiteChrome, loadingscreen, divider, links/photos providers
│   ├── home/               # HomeHeroCluster, PathwaysScroll, ProjectsMarquee, carousel
│   └── content/            # JoinCta, ProjectTile, ProjectCover, YearbookShelves, PeopleList, Medal, ViewToggle, visuals, cardIcons
├── server/                 # BACKEND: the service layer, by feature
│   ├── db/                 # Drizzle schema + Neon/PGlite client
│   ├── auth/               # auth.ts (Auth.js), session.ts (requireActor)
│   ├── core/               # actor.ts (Actor, CmsError, ensure), permissions.ts (ROLE_CAPS + can), revalidate.ts, settings.ts
│   ├── integrations/       # telegram/ (client, webhook, updates, polling), blob/uploads.ts
│   ├── people/             # people, tokens, telegram-link
│   ├── site/  projects/
│   ├── cohorts/            # cohorts.ts: AI Lodge semesters and DAP cohorts (the runs)
│   ├── ailodge/            # tracks.ts (Hack Day tracks), lodges.ts, feed.ts (the public AI Lodge feed contract)
│   ├── dap/                # newsletter.ts, colearning-groups.ts; tracker/ (service, view, bot, bot-text, bot-flows, mini-app, mcp)
│   ├── mcp/                # server.ts (TOOL_ACCESS, token check), context.ts, schemas.ts, tools/ one file per feature
│   ├── bot.ts              # the bot composition root (the site's one grammY Bot)
│   └── jobs.ts             # the daily jobs run by /api/cron/daily
├── shared/                 # taxonomy, paths, canonical-path, links and photos defaults, time (SGT dates), types/project.ts
├── proxy.ts                # case and legacy-path redirects
└── instrumentation.ts      # dev polling start

tests/                      # integration tests (tests/integration) and their helpers (tests/helpers)
scripts/                    # db-migrate, import-redis, server-only.mjs (the test runner's server-only hook)
docs/                       # setup/ (CMS, tracker), handoffs/ (AI Lodge site, links endpoint), proposals/
public/images/              # Static images (logo is white-on-transparent; nav tints it via CSS filter)
```

### Tests and CI
- Unit tests sit next to their module (`src/**/x.test.ts`); integration tests in `tests/integration/`,
  with helpers in `tests/helpers/` (a fresh migrated PGlite per file, an actor per role, a fake
  Telegram, a token helper, a no-op Next data cache, a shifted clock). `npm test` runs both, with
  `scripts/server-only.mjs` resolving `server-only` to an empty module as Next.js does on the server.
- `tests/integration/server-actions.test.ts` runs one action per feature through `run()`, with the session
  mocked by `mock.module`.
- `tests/integration/permissions.test.ts` and `mcp.test.ts` hold the expected access for every service
  write and the MCP tool list per role, written by hand: change them on purpose when a rule changes.
- `.github/workflows/ci.yml` runs lint, `tsc --noEmit`, `npm test` and `next build` on every PR and on
  pushes to `staging` and `main`, with no secrets.

### Page Structure

**Root Layout** (`src/app/layout.tsx`):
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
   - Tailwind 4: the theme lives in the `@theme` block of `src/app/globals.css` (no `tailwind.config.ts`)
   - Content paths configured for `./src/**/*.{js,ts,jsx,tsx,mdx}` (Tailwind 4 detects sources automatically)
   - Theme colors map to the CSS-variable tokens (`bg`, `surface`, `ink`, `pine`, `mint`, `emerald`, …)

3. **Global Styles**:
   - `src/app/globals.css` - imported in root layout; defines all design tokens, `.eyebrow`, `.glow-mint`, `float` keyframes
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
The home page (`src/app/page.tsx`) demonstrates a custom `ScrollReveal` component using IntersectionObserver for lazy animations. This pattern is used to animate sections as they enter the viewport.

### Client-only values
Don't `setState` inside an effect to read browser-only values (React 19 lint forbids it).
Use `useHydrated`, `useMediaQuery` or `useClientValue` from `src/components/ui/useClient.ts`.

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
  (CMS access + roles), `sessions` (DAP co-learning schedule, each linked to a group), `issues` ("This week in DAP"), `site_links` (club links), `site_settings` (switches such as applications open) and `site_photos` (replaced photos). Schema: `src/server/db/schema.ts`;
  SQL migrations in `drizzle/` (generate with `npm run db:generate` after editing the schema).
- **Local development needs no database account**: without `DATABASE_URL`, `src/server/db`
  uses an embedded PGlite database in `.data/pglite`, migrated on first use. It is
  single-process: stop `npm run dev` before running a script against it, and never open it
  from `generateStaticParams` (those run in worker processes).
- Images stay on **Vercel Blob** (or `public/uploads/` locally without a Blob token).
- **Upstash Redis is no longer used by this site.** It still backs the rate limiter for the
  deployed student projects (see `../bia-all-projects`).

### Service layer
`src/server/*` is the only place that reads or writes content. The admin server actions
(`src/app/admin/actions/`), the MCP endpoint (`src/server/mcp/server.ts`) and the cron route all
call it, so validation, permissions (`src/server/core/permissions.ts`), the one-winner-per-track rule and cache
revalidation (`src/server/core/revalidate.ts`, tags `projects` / `cohorts` / `newsletter`) apply everywhere.
Public pages read through `unstable_cache` with those tags (ISR 1h, busted on every change).

### CMS
- Sign-in: Auth.js (`auth.ts`) with Google, `@smu.edu.sg` accounts only, plus the email must
  be on the People list (or in `CMS_BOOTSTRAP_ADMINS`). Roles are re-read from the database
  on every request, and a person whose `access_ends` date has passed has no access. Local dev
  also has a dev sign-in with a role picker, superadmin included (never in production).
- Roles: **Superadmin** (the `CMS_BOOTSTRAP_ADMINS` emails, so it proves access to the
  deployment: an exco admin who is also the only role that manages People and roles),
  **Exco admin** (everything else), **DAP exco** (DAP only: cohorts, groups, schedule,
  newsletter, DAP projects), **AI Lodge exco** (AI Lodge only: semesters, tracks, lodges,
  Hack Day winners, AI Lodge projects) and **Lodge head** (only the projects of the lodges
  picked for them on People: add and edit drafts, submit for review; submitted and published
  projects are locked for them). Programme exco can't publish projects (an exco admin approves
  them) or edit Site links. Permissions live in `src/server/core/permissions.ts`: the `ROLE_CAPS` table (each role's
  capabilities) and `can`, which reads it and adds the contextual rules (`seeProject` vs `editProject`).
- Lodge head access ends by default `LODGE_HEAD_ACCESS_WEEKS` (20) weeks after the semester's
  **Week 1 Start Date** (`cohorts.starts_on`, set on the semester's Overview); People prefills
  that date (editable, or no end), and the MCP uses it when no date is given.
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
  a past semester's lodges stay as they ran. Service: `src/server/ailodge/lodges.ts`.
- **Public AI Lodge feed**: `GET /api/public/ailodge[?semester=<slug>]`, unauthenticated and
  read-only, built in `src/server/ailodge/feed.ts`. The AI Lodge site reads it; the contract
  and migration notes for that site are in [docs/handoffs/ailodge-site-handoff.md](docs/handoffs/ailodge-site-handoff.md).
  Bump `FEED_VERSION` before renaming or removing a field. Lodge links on smubia.com use each
  lodge's `path` from `lodgePaths()` (`/lodges/<slug>`, or `/lodges/past/<semester>/<slug>` when a
  later semester reuses the slug).
- The CMS is organised by run, like Vercel projects: a switcher at the top of the sidebar picks an
  AI Lodge semester or DAP cohort, and the run is in the path (`/admin/ailodge/<semester>[/projects]`,
  `/admin/dap/<cohort>[/co-learning-groups|/project-groups|/schedule|/newsletter|/projects]`; new runs at `/admin/<programme>/new`).
  Dashboard, All Projects, Site Links and People stay outside the switcher. Path helpers:
  `src/app/admin/_components/runs.ts`. The cohort slug `new` is reserved.
- DAP **Co-learning groups** (a cohort's Co-learning groups page): the groups that teach sessions,
  with members and 1–3 mentors (name, optional photo, LinkedIn, email, Telegram). The schedule picks
  the group teaching each week; groups show on the cohort's run page and the newsletter issues.
  Project groups are different people and aren't stored here: each is a project's `team`.
- Newsletter: publish now, or schedule a date; the daily Vercel Cron
  (`vercel.json`, 01:00 UTC = 09:00 SGT, ±1 h on Hobby) publishes due issues. Publishing can
  post once to the DAP Telegram channel (set in **Settings › Telegram**); "Send test" sends to one
  Telegram user ID (they must have sent /start to the bot). The same bot runs the DAP timeline
  tracker below, which receives updates on a webhook.
- MCP: `/api/mcp` exposes the CMS as tools for Claude. Each person creates a personal access
  token under **Settings › Access tokens** (`src/server/people/tokens.ts`, stored hashed); the MCP acts
  as that person with their current role, and lists only the tools that role can use
  (`TOOL_ACCESS` in `src/server/mcp/server.ts`, naming capabilities from `ROLE_CAPS`: a lodge head sees 8 tools, a superadmin all, including
  `list_people`, `set_person`, `remove_person` and `set_lodge_heads`). Locally (dev sign-in on)
  it also works without a token, as a superadmin.
- AI Lodge site refresh: after any change to lodges, semesters, links or photos, the CMS calls
  `AILODGE_REVALIDATE_URL` with `AILODGE_REVALIDATE_SECRET` (`src/server/core/revalidate.ts`), and the
  AI Lodge site rebuilds from the feed at once (it also refreshes hourly).

### DAP timeline tracker (Telegram bot)
Names: **co-learning groups** are the teaching groups (`dap_groups`, the schedule); **project groups** are the
tracker's teams (`project_groups`). Never write just "group" in code, UI or tool descriptions. A **cohort** is one
DAP run (a `cohorts` row); AI Lodge's equivalent is a **semester**.

- Data: `project_groups` with `milestones`, `subtasks` (assignee: a `project_members` row, or a typed
  `assignee_name` for someone not on the list) and `blockers`. There is no timeline table: a project group's
  timeline is its milestones by due date. Each milestone, task and blocker has a `number` within its project group
  (M2, T5, B1; counters on `project_groups`, never reused): the bot's commands take it, everything else uses `id`.
- Rules and permissions: `src/server/dap/tracker/service.ts` (`can.tracker` = DAP exco and exco admins). The bot only parses
  and replies; it never writes the database itself.
- Telegram, all through grammY: `src/server/integrations/telegram/client.ts` is plumbing (one `Api` client, `getBotUsername()` from getMe,
  error mapping) and imports no feature. `src/server/dap/tracker/bot.ts` is the tracker's grammY `Composer`, driven by the `COMMANDS`
  table (which also builds `/help` and the "/" menus). `src/server/bot.ts` is the only file that joins the two: the
  site's one `Bot`, with an error boundary and the once-per-update check (`integrations/telegram/updates.ts`). Views that list
  several things are Telegram rich messages (tables, headings), never text strung together with dots.
- Webhook: `/api/telegram/webhook`, grammY's `webhookCallback` with `TELEGRAM_WEBHOOK_SECRET`. After a good
  secret it always answers 200; errors are logged and answered in the chat.
- Admins are recognised by `people.telegram_user_id` (the numeric ID, never the username), set by a one-time
  link from **Settings › Telegram** (`src/server/people/telegram-link.ts`: random code, stored hashed, 10 minutes, single use).
  A project group's chat is connected the same way, with **Connect Telegram Chat** on its page
  (`t.me/<bot>?startgroup=<code>`). The bot listens only in connected chats, and everyone in one has member
  rights for that project group; inside it even admins reach only that group (what the bot posts there, the
  whole group sees). Admins reach every group from a private chat (`/groups`, `g3`, current cohort).
- Mini App (`/mini-app`, `src/server/dap/tracker/mini-app.ts`, `/api/mini-app/{session,timeline,action}`): opened by `/start` (a `web_app`
  button for linked admins in a private chat; a `t.me/<bot>/<name>?startapp=g3` link in a connected group chat). Every
  request carries Telegram's signed `initData` (`Authorization: tma …`), verified with the bot token. Access is never taken
  from the link: a linked DAP exco opens every project group; anyone else only a project group whose connected chat Telegram
  confirms they are in (`getChatMember`, so the bot must be an admin there). It shows the timeline and makes the bot's changes
  (tasks, blockers, meetings for members; milestones and reminders for DAP exco) through `POST /api/mini-app/action`, an
  allowlist of `ACTIONS` in `src/server/dap/tracker/mini-app.ts` that calls the same `service.ts` rules as the bot. UI copy follows `SKILL.md`.
- Local development: `src/instrumentation.ts` long-polls Telegram from the dev server (never when the bot has a
  webhook), so the bot works on localhost.
- Daily cron `/api/cron/daily` runs the jobs in `src/server/jobs.ts`, each on its own: publish due issues,
  the 3-week meeting reminders, and cleanup of old update IDs and expired link codes.
- CMS: the DAP run's **Project Groups** (`/admin/dap/<cohort>/project-groups[/<id>]`) and **Settings › Telegram**
  (Your Account for everyone with tracker access; DAP channel, webhook and linked accounts for exco admins).
  MCP tools: `list_project_groups`, `get_project_group_timeline`, `add_milestones`, `set_milestone_status`,
  `log_project_group_meeting`, `set_meeting_reminders` (no delete tools).
- Setup and commands: [docs/setup/tracker-setup.md](docs/setup/tracker-setup.md).

### URLs
All paths are lower-case and kebab-case (`/work-with-us`, `/contact-us`); folder names under
`app/` match. Old forms (capitals, `/WorkWithUs`, `/workwithus`) redirect in `src/proxy.ts`.

- `/projects` (all projects), `/projects/ailodge` (the live semester once it has projects, until then the
  newest semester that has some), `/projects/ailodge/<semester>`
- `/projects/dap` (current cohort's yearbook), `/projects/dap/<cohort>`
- Project pages: `/projects/ailodge/<semester>/<slug>` and `/projects/dap/<cohort>/<slug>`.
  Build links with `projectPath()` / `cohortPath()` / `dapRunPath()` / `issuePath()` from
  `src/shared/paths.ts`. A project moved to another semester redirects from its old address.
- `/dap` (recruitment page), `/dap/<cohort>` (the run: latest issue, schedule, groups),
  `/dap/<cohort>/week-<n>` (an issue)
- `/work-with-us`, `/contact-us`, `/curriculum`
- Legacy `/Projects?badge=…`, `/projects/ai-lodge` and any path with capitals
  redirect in `src/proxy.ts` (mapping in `src/shared/canonical-path.ts`). Old project links
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
| `TELEGRAM_BOT_TOKEN` | Club bot (newsletter and tracker). Unset = messages are logged, not sent. Its username comes from getMe |
| `CRON_SECRET` | Authenticates the Vercel Cron call to `/api/cron/daily` |
| `AILODGE_REVALIDATE_URL` | The AI Lodge site's revalidate route, e.g. `https://ailodge.smubia.com/api/revalidate` (unset = it refreshes hourly) |
| `AILODGE_REVALIDATE_SECRET` | Shared secret for that route; the same value is set on the AI Lodge site |
| `TELEGRAM_MINI_APP_NAME` | The tracker Mini App's short name from BotFather (`/newapp`). Unset = `/start` in a group chat shows the command list instead of the app link |
| `TELEGRAM_WEBHOOK_SECRET` | Secret the bot's webhook (`/api/telegram/webhook`) checks; Set Webhook sends it to Telegram. Required on Vercel. Secrets stay environment variables, never in the database |
| `TELEGRAM_DAP_CHANNEL_ID` | Deprecated: read only until the DAP channel is saved in Settings › Telegram, then remove it |
| `NEXT_PUBLIC_SITE_URL` | Absolute links in Telegram posts (default `https://www.smubia.com`) |

### Scripts
- `npm run db:migrate`: apply migrations (runs automatically on Vercel via `vercel-build`)
- `npm run db:import-redis [-- --commit] [--overwrite]`: the one-off, re-runnable import of the
  Redis-era projects. It is the only data script allowed: content changes go through `/admin`
  or the MCP tools, not seed scripts.

Full setup and cutover checklist: [docs/setup/cms-setup.md](docs/setup/cms-setup.md).

## Common Development Tasks

### Adding a New Page
1. Create directory: `src/app/YourPage/`
2. Create `page.tsx` inside
3. Add "use client" if component needs interactivity
4. Page automatically appears at `/yourpage` route
5. Import components as needed

### Adding a New Component
1. Create file in `src/components/<ui|site|home|content>/ComponentName.tsx` (or next to the route if only one page uses it)
2. If using styled CSS, create `ComponentName.module.css` beside it
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
project. They show a "projects have moved" page (`src/app/projects/[slug]`) with links to the new locations.

- Case and renamed-path redirects go in `src/proxy.ts` / `src/shared/canonical-path.ts`. Its
  matcher only fires on paths with a capital letter (plus a few listed old forms), so normal
  visits never run the proxy. `next.config.mjs` redirect sources match case-insensitively, so
  a `/DAP` → `/dap` rule there loops forever.
- Cross-domain and other simple redirects can live in `next.config.mjs`.

## Notes for Future Development

- The project uses both CSS Modules and Tailwind CSS - maintain this duality for consistency
- Build new UI with the shared primitives in `src/components/ui/` and the design tokens
- Remote image hosting (Vercel Blob/S3) allows for dynamic content without rebuilds
- All pages use the root layout structure (Navbar, Footer, SocialDots) - keep this consistent
- Path alias `@/*` maps to `./src/*` (`@/server/...`, `@/shared/...`, `@/components/...`, `@/app/...`)
