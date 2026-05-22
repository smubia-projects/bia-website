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
- **Styling:** Tailwind CSS + CSS Modules
- **UI Components:** React Bootstrap, NextUI, React Icons, Lucide Icons, Swiper
- **Hosting:** Vercel (www.smubia.com)
- **Analytics:** Vercel Analytics and Speed Insights

## Project Architecture

### Directory Structure

```
app/
├── components/          # Reusable React components
│   ├── nav.tsx         # Navigation bar (appears on all pages)
│   ├── footer.tsx      # Footer bar (appears on all pages)
│   ├── socialmedia.tsx # Social dots sidebar
│   ├── loadingscreen.tsx
│   ├── ProjectCard.tsx # Project card for showcase grid
│   ├── Timelines/      # Timeline components with mobile/desktop variants
│   ├── EventCard.tsx   # Event card component
│   └── [other components with .module.css for styling]
├── lib/
│   ├── auth.ts         # HMAC cookie auth (ADMIN_PASSWORD env var)
│   └── projects.ts     # Read/write projects JSON from Vercel Blob
├── admin/              # Password-protected admin panel
│   ├── page.tsx        # Server component — checks auth, loads data
│   ├── AdminClient.tsx # Client component — CRUD dashboard
│   ├── LoginForm.tsx   # Login form component
│   ├── actions.ts      # Server Actions (login, add, edit, delete)
│   └── Admin.module.css
├── Projects/
│   ├── data/types.ts   # Project & TeamMember interfaces
│   ├── page.tsx        # Server Component — fetches from Blob (ISR 1h)
│   ├── ProjectsContent.tsx  # Client component — filter/grid
│   ├── Projects.module.css
│   └── [slug]/
│       ├── page.tsx              # Server Component — fetches from Blob
│       ├── ProjectDetailContent.tsx  # Client component — carousel/content
│       └── ProjectDetail.module.css
├── layout.tsx          # Root layout with global structure
├── page.tsx            # Home page
├── ContactUs/page.tsx
├── WhatWeDo/page.tsx
├── Datathon/page.tsx
├── Merchandise/page.tsx
├── globals.css         # Global Tailwind and base styles
└── fonts/              # Custom fonts (Inter, Roboto Mono)

scripts/
├── seed-projects.mjs   # One-time seed of existing projects to Blob

public/
├── images/             # Static images (local)

next.config.mjs         # Config for remote image domains
```

### Page Structure

**Root Layout** (`app/layout.tsx`):
- Loads fonts (Inter, Roboto Mono)
- Wraps all pages with Navbar, Footer, SocialDots
- Includes Vercel Analytics and Speed Insights
- Bootstrap CSS imported globally

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
   - Custom colors use CSS variables: `var(--background)`, `var(--foreground)`

3. **Global Styles**:
   - `app/globals.css` - imported in root layout
   - Bootstrap CSS also imported globally

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
- Project data lives in Vercel Blob as `data/projects.json` (not in the repo)
- The `/Projects` page fetches from Blob at render time with ISR (revalidates every 1 hour)
- When projects are added/edited/deleted via the admin panel, `revalidatePath()` busts the cache immediately
- The `Project` and `TeamMember` interfaces are defined in `app/Projects/data/types.ts`

### Admin Panel (`/admin`)
- Password-protected route — password stored as `ADMIN_PASSWORD` Vercel env var
- Auth uses HMAC-signed httpOnly cookies (24h expiry), no database required
- Supports: add, edit, delete projects + direct image upload to Vercel Blob
- Server Actions in `app/admin/actions.ts` handle all mutations

### Environment Variables Required
| Variable | Purpose |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob access (auto-set when you link a Blob store in Vercel) |
| `ADMIN_PASSWORD` | Password for the `/admin` route |

### Seeding Initial Data
Run once after setting up the Blob store:
```powershell
$env:BLOB_READ_WRITE_TOKEN = "vercel_blob_..."
node scripts/seed-projects.mjs
```

### Adding a Project (via Admin)
1. Go to `/admin` and log in
2. Click "Add Project" and fill in the form
3. Submit — project is saved to Blob and the showcase page updates immediately

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
- **Blob Storage:** Used for hosting images and PDFs
- **Deployment:** Automatic on push to main branch

## Notes for Future Development

- The project uses both CSS Modules and Tailwind CSS - maintain this duality for consistency
- Bootstrap is imported globally but NextUI is the preferred component library for new UI
- Remote image hosting (Vercel Blob/S3) allows for dynamic content without rebuilds
- All pages use the root layout structure (Navbar, Footer, SocialDots) - keep this consistent
- Path alias `@/*` maps to repository root, enabling cleaner imports
