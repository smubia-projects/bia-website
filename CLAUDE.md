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

SMUBIA (Singapore Management University Business Intelligence & Analytics Club) website built with Next.js 14. The site showcases the club's mission, vision, events, and community.

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
- All club URLs (Telegram, sign-up form, Instagram, prospectus, etc.) live in `app/lib/links.ts` — TODO placeholders must be filled before launch

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
│   ├── auth.ts         # HMAC cookie auth (ADMIN_PASSWORD env var)
│   ├── links.ts        # Single source of truth for all club URLs/CTAs
│   └── projects.ts     # Read/write project data via Upstash Redis + image upload to Vercel Blob
├── admin/              # Password-protected admin panel (stays dark-themed, style-isolated)
├── Projects/
│   ├── data/types.ts   # Project & TeamMember interfaces
│   ├── page.tsx        # Server Component — fetches from Redis (ISR 1h), Suspense for search params
│   ├── ProjectsContent.tsx  # Client component — filter/grid; supports /Projects?badge=DAP deep links
│   └── [slug]/         # Project detail page (Redis fetch + carousel)
├── DAP/                # Flagship Data Associate Programme page (content in data.ts)
├── WorkWithUs/         # Sponsorship page (tiers/benefits/events in data.ts, from prospectus)
├── WhatWeDo/           # Offerings: workshops curriculum, events timeline, datathon section
│   └── datathonData.ts # Datathon stats/copy
├── Datathon/page.tsx   # Redirects to /WhatWeDo#datathon (route kept for old links)
├── ContactUs/page.tsx  # Join CTAs (#join anchor), channels, address
├── Merchandise/page.tsx # Placeholder (not in nav)
├── layout.tsx          # Root layout: fonts, metadata, Navbar/Footer/LoadingScreen
├── page.tsx            # Home: dark hero, offerings, stats, DAP band, testimonials, join CTA
└── globals.css         # Tailwind + design tokens (CSS variables)

scripts/
├── seed-projects.mjs   # One-time seed of existing projects to Upstash Redis

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

## Project Data & Admin Panel

### How Project Data Works
- Project data is stored in Upstash Redis as per-project keys:
  - `projects:index` — a Redis list of all project slugs (maintains order)
  - `project:{slug}` — a JSON object for each individual project
- Images/PDFs remain on Vercel Blob (CDN) — Redis stores only the URLs
- The `/Projects` page fetches all projects from Redis at render time with ISR (revalidates every 1 hour)
- The `/Projects/[slug]` detail page fetches a single project (1 Redis GET)
- When projects are added/edited/deleted via the admin panel, `revalidatePath()` busts the cache immediately
- The `Project` and `TeamMember` interfaces are defined in `app/Projects/data/types.ts`

### Admin Panel (`/admin`)
- Password-protected route — password stored as `ADMIN_PASSWORD` Vercel env var
- Auth uses HMAC-signed httpOnly cookies (24h expiry), no database required
- Supports: add, edit, delete projects + direct image upload to Vercel Blob
- Per-project show/hide toggle controls whether a project appears on the public `/Projects` listing (`hidden` flag on the Project type); **new projects are created hidden** and must be toggled visible
- Server Actions in `app/admin/actions.ts` handle all mutations

### Environment Variables Required
| Variable | Purpose |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob access for image/PDF uploads (auto-set when you link a Blob store in Vercel) |
| `ADMIN_PASSWORD` | Password for the `/admin` route |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST API URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST API token |

### Seeding Initial Data
Run once after setting up the Redis store:
```powershell
node scripts/seed-projects.mjs
```

### Adding a Project (via Admin)
1. Go to `/admin` and log in
2. Click "Add Project" and fill in the form
3. Submit — project is saved to Redis (images uploaded to Blob) as **hidden**
4. Flip the project's visibility toggle in the list when it's ready to go live; the showcase page updates immediately

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
- **Upstash Redis:** Used for project data storage (structured JSON)
- **Deployment:** Automatic on push to main branch

## Notes for Future Development

- The project uses both CSS Modules and Tailwind CSS - maintain this duality for consistency
- Build new UI with the shared primitives in `app/components/ui/` and the design tokens; NextUI remains only for `CustomModal`
- Remote image hosting (Vercel Blob/S3) allows for dynamic content without rebuilds
- All pages use the root layout structure (Navbar, Footer, SocialDots) - keep this consistent
- Path alias `@/*` maps to repository root, enabling cleaner imports
