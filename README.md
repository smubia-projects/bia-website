# SMUBIA Website

The official website for **SMUBIA** (Singapore Management University Business Intelligence & Analytics Club), built with Next.js 14.

**Live:** [www.smubia.com](https://www.smubia.com)

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + CSS Modules
- **UI:** React Bootstrap, NextUI, Lucide Icons, Swiper
- **Data:** Upstash Redis (project data) + Vercel Blob (images/PDFs)
- **Hosting:** Vercel
- **Analytics:** Vercel Analytics & Speed Insights

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
ADMIN_PASSWORD=your_admin_password
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

| Variable | Purpose |
|---|---|
| `ADMIN_PASSWORD` | Password for the `/admin` panel |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob access for image/PDF uploads |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST API URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST API token |

### Development

```bash
npm run dev       # Start dev server on http://localhost:3000
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

### Seeding Project Data

Run once after setting up Upstash Redis to populate initial project data:

```bash
node scripts/seed-projects.mjs
```

## Project Structure

```
app/
├── components/       # Reusable components (nav, footer, cards, timelines)
├── lib/
│   ├── auth.ts       # HMAC cookie auth
│   └── projects.ts   # Redis data layer + Blob image uploads
├── admin/            # Password-protected admin panel (CRUD for projects)
├── Projects/         # Project showcase pages
│   ├── page.tsx      # List view (fetches all from Redis, ISR 1h)
│   └── [slug]/       # Detail view (fetches single project from Redis)
├── ContactUs/        # Contact page
├── WhatWeDo/         # Activities page
├── Datathon/         # Datathon page (embedded iframe)
├── WorkWithUs/       # Sponsorship/partnership page
└── layout.tsx        # Root layout (navbar, footer, analytics)

scripts/
└── seed-projects.mjs # One-time Redis seed script

public/
└── images/           # Static images
```

## Data Architecture

Project data is stored in **Upstash Redis** using per-project keys:

- `projects:index` — ordered list of all project slugs
- `project:{slug}` — JSON object for each project

Images and PDFs are uploaded to **Vercel Blob** (CDN). Redis stores only the CDN URLs.

### Admin Panel

Navigate to `/admin` and log in with the admin password to:

- Add new projects (with image upload)
- Edit existing projects
- Delete projects

Changes take effect immediately via `revalidatePath()`.

## Deployment

Deployed automatically on push to `main` via Vercel. Ensure all environment variables are set in the Vercel dashboard.

## Contributors

Created by Quek Zheng Seng & Brejesh
