# Handoff: a small public endpoint for the deployed project demos

From `../bia-all-projects` (noted 2026-11-07). This is a proposal, not built. Build it after the CMS
cutover, once www.smubia.com serves `/api/public/*`. Today only the `feat/cms` preview does.

## Why

About 45 deployed student demos (AI Lodge on Cloud Run + Vercel, DAP on HF Spaces) show a
**rate-limit CTA modal** when a visitor hits the limit. It has three buttons: "Join {programme}",
"Explore other projects" and "View on GitHub". Each project has these links typed into its own
code, so they drift. Five projects still use `/showcase` or `/ai-lodge`, and "Join AI Lodge" goes to
`smubia.com/ailodge` rather than the sign-up form, so it ignores the applications switch.

The demos are moving to one shared modal script that fetches its links from the CMS and falls back
to built-in defaults if the fetch fails. `GET /api/public/ailodge` already has the right links, but it
doesn't suit this:

- **Too heavy.** Every modal would download lodges, semesters, trails and photos just to use
  three URLs.
- **Not cached** (`Cache-Control: no-store`). Every modal open would reach the function and the DB.
  That's fine for the AI Lodge site, but not for 45 demos with public traffic.
- **AI Lodge only.** DAP demos have nothing like it.
- **Nothing per project.** It can't return a project's own page or repo.

## What the demos need

| Need | Source in the CMS |
|------|-------------------|
| Join link per programme, already resolved through the applications switch | `joinLink(links, programme)` |
| Whether applications are open (button label: "Join" vs "Get notified") | `links.applications` |
| Programme page (AI Lodge site / DAP page) | `aiLodgeInfosite`, `/dap` |
| Projects page for the programme | `/projects/ailodge`, `/projects/dap` |
| Optional, per project: its CMS page, repo and live demo | `projects.path`, `sourceUrl`, `liveUrl` |

Nothing private. Only published projects return project fields.

## Format options

### A. Dedicated links endpoint (recommended as the base)

```
GET /api/public/links
GET /api/public/links?programme=ailodge        # or dap
```

```json
{
  "version": 1,
  "generatedAt": "2026-11-07T08:00:00.000Z",
  "programmes": {
    "ailodge": {
      "name": "AI Lodge",
      "join": { "url": "https://forms.gle/…", "open": true, "label": "Join AI Lodge" },
      "programmeUrl": "https://ailodge.smubia.com",
      "projectsUrl": "https://www.smubia.com/projects/ailodge"
    },
    "dap": {
      "name": "DAP",
      "join": { "url": "https://t.me/join_smubia_dap", "open": false, "label": "Get notified" },
      "programmeUrl": "https://www.smubia.com/dap",
      "projectsUrl": "https://www.smubia.com/projects/dap"
    }
  },
  "club": { "telegram": "https://t.me/…", "site": "https://www.smubia.com" }
}
```

`?programme=` cuts the response down to one entry under `programmes` but keeps the same shape, so
clients parse it the same way.

### B. Per-project lookup (add when the modal links to the project's own page)

```
GET /api/public/links?project=<fullSlug>
```

This returns everything in A for that project's programme, plus:

```json
"project": {
  "slug": "formly",
  "fullSlug": "ail-ay2627-s1-william-formly",
  "title": "Formly",
  "pageUrl": "https://www.smubia.com/projects/ailodge/ay2627-s1/formly",
  "sourceUrl": "https://github.com/smubia-projects/ail-ay2627-s1-william-formly",
  "liveUrl": "https://ail-ay2627-s1-william-formly.vercel.app"
}
```

- **Slugs (decided):** the short CMS slug (`formly`) is only for smubia.com URLs. Everything else
  (the GitHub fork, Docker image, Cloud Run service, Vercel project, rate-limit slug) uses the
  **full slug** (`ail-ay2627-s1-william-formly`). Add one column, `projects.fullSlug` (unique,
  nullable for projects with no deployed demo), filled in by the deploy scripts. Look projects up
  only by it. Don't derive it from `sourceUrl`, which may point to the student's own repo. The
  rate-limit Ops page uses the same column (`docs/rate-limit-ops-plan.md`). The full plan is in
  `../bia-all-projects/DOCS/shared/centralisation-decisions.md`.
- An unknown, draft or unpublished project returns `200` with `"project": null` plus the programme
  links, not `404`, so the modal still has working buttons.

### C. Field selection on the existing feed (not recommended)

```
GET /api/public/ailodge?fields=applications,links
```

This is the smallest change, but it keeps the AI Lodge-only shape and the `no-store` caching, and
the response type changes depending on the query. Use it only if A is out of scope.

## Caching and limits

- Send `Cache-Control: public, s-maxage=300, stale-while-revalidate=86400`. Vercel's CDN then serves
  almost every request, and a CMS link change shows up within about 5 minutes. When `links` is
  revalidated, also purge the CDN path if that's easy, but it isn't required.
- `?project=` adds variants to the cache key. That's fine at this scale (one per demo).
- CORS `*`, `GET, OPTIONS` only, the same as `/api/public/ailodge`.
- If the DB read fails, return the `DEFAULT_LINKS` values with `200` and `"stale": true`, not `503`.
  The modal must always get working links.
- Keep the response under about 2 KB. No images.

## Contract rules

- `version` goes up only for breaking changes. Only add fields, never rename them.
- All URLs are absolute and lower-case paths.
- `join.url` is already resolved (form vs Telegram). Clients never re-implement `joinLink()`.
- Document the final shape in this file (or a `docs/public-api.md`), and link it from
  `../bia-all-projects/DOCS/ailodge/deployment-playbook.md` → Rate Limit CTA Modal.

## Modal copy from the CMS (decided 2026-11-08)

Each project's rate-limit modal copy moves into the CMS, so exco can edit it without a redeploy. Add to the
`projects` record (edited on the project's page in /admin, next to the write-up):

| Field | Meaning |
|-------|---------|
| `ctaHeadline` | One line in the project's voice about what the visitor just did |
| `ctaHook` | The mission question, e.g. "Want to build AI that helps people look out for each other?" |
| `ctaInvitation` | One energetic sentence about AI Lodge / DAP |

`?project=<fullSlug>` returns them inside `project.cta` (null when empty, so the demo falls back to its built-in
copy). Copy rules (no request counts, no repetition, no generic lines) are in
`../bia-all-projects/DOCS/ailodge/deployment-playbook.md` → "Modal copy". The CMS form should show them as hints,
with a live preview of the modal. The first values come from the copy review being done now
(`../bia-all-projects/ailodge/_cta-copy-2026-11-08.md`), imported once the fields exist.

Colours and emoji stay in each demo's code (they belong to its design).

## Out of scope here

- Rate-limit controls: see `docs/rate-limit-ops-plan.md`.
