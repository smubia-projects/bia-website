# Admin Panel — Add Project (No Database)

## Overview

A password-protected `/admin` route that lets authorised users add, edit, and delete projects on the showcase without a git push or PR. Vercel Blob acts as the data store via a `projects.json` file.

---

## UI & Design

- The admin panel must match the existing site's look and feel exactly — same fonts, colours, Tailwind utility classes, and component patterns as the rest of the site
- Use the same Tailwind colour presets defined in `tailwind.config.ts`
- Follow the same CSS Modules + Tailwind duality used elsewhere; do not introduce new styling approaches
- The login page and admin dashboard should feel like a natural extension of the site, not a separate tool

---

## Data Layer — Vercel Blob

- A single `projects.json` file lives in the Vercel Blob store
- It is a JSON array of project objects, replacing the current static `.ts` data file
- This is the sole source of truth for the project showcase

---

## Showcase Page (public)

- Next.js Server Component fetches `projects.json` from Blob at render time
- Uses `fetch(..., { next: { revalidate: 3600 } })` — visitors never hit Blob directly
- When a project is added/edited/deleted via the admin panel, `revalidatePath()` is called server-side to immediately bust the cache so changes appear without waiting for the 1-hour window

---

## Authentication (no database required)

- Password stored as a Vercel environment variable (`ADMIN_PASSWORD`) — never in code
- On login form submit, a **Server Action** compares the submitted password against the env var
- If correct, an **httpOnly cookie** is set containing an HMAC signature
  - HMAC is computed using Node's built-in `crypto` module (no new npm packages)
  - The `ADMIN_PASSWORD` env var is used as the signing secret
  - The cookie value proves validity without needing any session table or database
- Every admin page load verifies the cookie server-side before rendering anything
- If cookie is missing or invalid, only the login form is shown

---

## Admin Page (`/admin`)

**Unauthenticated state:** login form only (password field + submit)

**Authenticated state:**
- List of existing projects pulled from `projects.json`, each with Edit and Delete buttons
- "Add Project" form with fields:
  - Title
  - Description
  - Tags (comma-separated)
  - GitHub / Live URL
  - Image (file input — uploaded directly to Vercel Blob, URL stored automatically)
  - Any other fields matching the current project data shape

---

## Image Upload

- Admin form includes a file input for the project image
- On form submit, the Server Action receives the `File` object and calls `put(filename, file, { access: 'public' })` from `@vercel/blob`
- The returned public URL is stored as the image field in the project JSON
- No manual Vercel dashboard upload needed

---

## Edit Project

- Each project in the admin list has an Edit button
- Clicking Edit pre-fills the Add/Edit form with the project's existing values
- On submit, the Server Action finds the project by ID, merges the updated fields, writes the array back to Blob, and calls `revalidatePath()`
- Image field on edit: if a new file is selected it replaces the old one (new Blob upload); if left empty the existing image URL is kept

---

## Delete Project

- Each project in the admin list has a Delete button
- On confirm, the Server Action filters the project out of the array by ID, writes the array back to Blob, and calls `revalidatePath()`
- A confirmation step (e.g. "Are you sure?") should be shown before the delete Server Action is called

---

## Server Action Pattern (add / edit / delete)

1. Verify the session cookie server-side (never trust the client)
2. Fetch current `projects.json` from Blob
3. Mutate the array (append / update / filter)
4. Overwrite `projects.json` in Blob
5. Call `revalidatePath('/Projects')` to immediately update the public showcase

---

## Request Flow

```
You → /admin (no cookie) → login form shown
You → submit password → Server Action checks env var → sets httpOnly HMAC cookie
You → /admin (valid cookie) → project list + add/edit form shown

Add:    fill form → submit → append to JSON → write Blob → revalidatePath
Edit:   click Edit → form pre-filled → submit → update JSON → write Blob → revalidatePath
Delete: click Delete → confirm → filter JSON → write Blob → revalidatePath

Public showcase → updated immediately on next request
```

---

## Dependencies

| Requirement | Source |
|---|---|
| Blob read/write + image upload | `@vercel/blob` (already installed) |
| HMAC signing | Node built-in `crypto` (no install needed) |
| Cache revalidation | Next.js built-in `revalidatePath` |
| Environment variables | Vercel dashboard → `ADMIN_PASSWORD` |

No new npm packages required.

---

## Failure Modes

- **Vercel Blob down:** Public showcase serves the cached version until Blob recovers. Since the site itself runs on Vercel, a Blob outage and a site outage are effectively the same event — no extra failure surface introduced.
- **Cookie stolen:** Attacker can add/edit/delete projects. Mitigation: use a strong unique password, add cookie expiry (e.g. 24h).
- **Brute force:** Mitigated by a strong password. Can add a simple attempt counter in a Blob file if needed later.

---

## Out of Scope

- Multi-user / role-based access
- Audit log of changes
