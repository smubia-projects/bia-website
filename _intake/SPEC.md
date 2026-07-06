# SMUBIA site spec — living document

Status: **design direction LOCKED (Q&A completed 2026-07-07).** Next: initial edit pass.
Copy drill-down comes after the edit pass. Numbers/links marked TBC/TODO throughout.

---

## 1. Design system (updated — supersedes pine-era decisions)

### Palette — REVISED 2026-07-07 (navy anchor VETOED by user in live review)
**Brand hex codes are general palette direction only — NOT literal values ("we don't need to
stick to the brand colours 100%, just the general palette").**

| Role | Value |
|---|---|
| Dark anchor sections | **deep pine `#0C211C` stays** (navy `#182860` rejected as anchor — "ugly") |
| Accent on dark | mint `#7DD7C2` family stays |
| Warm highlight | **sand `#ffd392`, sparingly** (most generous on AI Lodge) — token added Wave 1 |
| Accent on light | emerald `#0E7C5B` (kept; brand teal fails contrast raw — darkened `--teal-deep #1E7A70` passes, use sparingly) |
| Light base | `#F6FAF8` stays |
| Brand teals | `--teal #3cbeb4` / `--teal-mid #289d94` / `--teal-deep #1E7A70` optional accents (raw teals are fills-only on light) |

**AI Lodge exception:** its anchor sections are *warm dusk* + amber glow — tokens added Wave 1:
`--dusk #241A12`, `--dusk-deep`, `--dusk-surface`, `--dusk-border`, `--dusk-text`, `--amber #FFC978`,
`.glow-amber`. Two darks: DAP = cool deep pine (premium), AI Lodge = warm dusk (fireside).

### Fonts
Unchanged: Bricolage Grotesque (display), Inter (body), Roboto Mono (eyebrows/stats).

### Tone
Playful base sitewide (mascot in nav + footer + fun corners, warm casual voice);
**DAP is the restrained premium exception** — the contrast itself signals premium.
Trim GenAI verbosity hard. Pages shorter. Copy structured h1/h3/h5 + body.

### Motion
**Lively** (v1): scroll reveals + count-ups (existing), photo marquees/reels, gentle hover
lifts/tilts, Projects carousel hero. Respect `prefers-reduced-motion`.
⚠ User may call "tone it down to moderate" — build so marquees/tilts are easy to disable.

### Stats pattern (sitewide)
Big-number spotlight: ONE focal number large, minor stats small beneath (per WWU HTML draft).
Visuals over words. **All numbers marked TBC** until user confirms (member count, IG/TG/LI, etc.).

### Brand assets
- New cat mascot (USB-cable tail) + full wordmark: `_intake/brand-assets-updated/*.svg`,
  white-on-transparent → existing nav CSS-tint trick still works. Mascot becomes nav brand mark.
- Campfire SVGs (tree/fire/log) in `_intake/ailodge-indiv-page/` — **backup only**; achieve
  fireside via colour/glow, not literal scenery.

### Photos
22 candid shots in `_intake/` (mostly 4:3 / portrait). Fresh photos preferred; reuse OK for
curriculum workshops. Candids go in clusters/splits, never full-bleed heroes.

### Glassmorphism
LAST step, after everything else, as its own git commit (rollbackable experiment).

---

## 2. Site map & nav (locked)

`Home · Events · DAP · AI Lodge · Projects · Work With Us · Contact/Join (pill)`

- "What We Do" → renamed **Events**, narrowed to events & workshops.
- AI Lodge = new top-level page.
- Datathon: removed; leave code placeholder to restore later. `/Datathon` redirect stays.
- Merchandise: unchanged (hidden, not in nav).
- Remove prospectus button everywhere.
- Hero treatment mix: split hero (Events, WorkWithUs) · photo-cluster (Home, AI Lodge) ·
  dark typographic (DAP).

---

## 3. Pages

### Home
Cluster hero (playful) → three pillars (DAP / AI Lodge / Events) → one big stat spotlight (TBC)
→ featured projects strip → testimonials **kept, trimmed to 3–4 strongest, shorter excerpts**
→ join CTA. General feedback applies: fewer words, more visuals.

### DAP — "premium, not cringey"
- **Dark immersive** (deep pine — navy vetoed): page leans dark, spacious, hairline rules, quiet mint, understated motion.
- AY26/27 curriculum (from `_intake/dap-indiv-page/upcoming-ay2627-curriculum.md`), numbered 01–09:
  regression, classification, ensemble learning, neural networks, recommender systems, CV, NLP1, NLP2, RL.
- Photos: cohort pic, co-learning group shots (covers 4 of 9 topics — reuse OK), presentation shots.
- Before styling: research real references (award-site/editorial patterns), NOT templated
  frontend-design defaults — per user's explicit note.

### AI Lodge (NEW page)
- **Fireside ambience through colour/light**: warm, friendly, inviting; amber glow gradients,
  warm dusk anchors. Vibe, not scenery. Poster ref: `_intake/ailodge-indiv-page/campfire-vibe-example.png`.
- Content (from yap.md): 8-week programme, teams = "lodges". 7 lodges × (8–10 lodgers + 3 lodge
  captains), ~70 lodgers (mark TBC — likely last year's numbers).
  Sections: Overview · Weekly Lodge Sessions · AI Lodge Family (emotional heart) · AI Lodge
  Hackathon (NEW: Hack Day launch → top 10 finalists → Finals Day pitches + prizes + networking)
  · Highlights (flowing photo reel from 13 candids).
- Infosite link: placeholder `#` for now (user will supply).
- Poster shows SMU IIE co-branding — resolve at copy phase whether IIE appears on page.
- Photos: lodge group shots (JB Lodge, AWSome Lodge, Lodge LAB) + demo-day set.

### Events (was WhatWeDo)
Events & workshops page: public workshops, events timeline, community activities.
DAP/AI Lodge get only brief mentions/links. Datathon section removed w/ placeholder comment.

### Projects
- Listing: **horizontal flowing carousel hero** on top → grid (keep, with filters) below →
  cohesive transition → vibrant CTA band at bottom: one headline ("Want your project up here?"),
  **two labeled buttons** (Join DAP / Join AI Lodge). More projects coming — build layout first.
- Detail pages: **showcase-first, story below.** Top = screenshot carousel, "Try it live"
  (deployed projects), GitHub, tech-stack chips, builder credit. Below = long-form Tech Comms
  article. Projects without long copy fall back to shorter same layout.
- User will screenshot deployed projects for the showcase carousels.
- 3 articles ready (extracted from Tech Comms.pdf): CaloTracko (v1 & v2 variants — pick at copy
  phase), Storie, Enhance AI. All AI Lodge projects. Voice stays playful.
- Data model: needs `article` (long-form body) + `liveUrl` fields added to Project type.

### Work With Us
- **Tiers are OUT** (Bronze→Platinum draft superseded). Replace with **2 involvement types**:
  1. Partner on events (workshops or corporate)
  2. Sponsor/partner on programmes (problem challenges etc.)
- Stat spotlight treatment (2,000+ focal — TBC), per the HTML draft layout which is otherwise
  a good structural reference: `_intake/work-with-us-page/raw-html-feedback.html`.

### Contact / Join
Three join destinations, clearly separated: general BIA membership · DAP · AI Lodge.

---

## 4. Open items (waiting on user)
1. All real URLs for `app/lib/links.ts` (telegram, join forms × 3?, AI Lodge infosite) — "later".
2. All stat numbers — TBC, user checking with the right people.
3. Sonya's further AI Lodge content (if any beyond yap.md).
4. Screenshots of deployed projects.
5. AY26/27 anything that differs from the notes (lodge counts, cohort sizes).
6. IIE co-branding on AI Lodge page?
7. CaloTracko article: v1 (longer) or v2 (tighter)?

## 5. Sequence
1. ~~Q&A → spec~~ ✅ (this doc)
2. **Initial edit pass** (next): palette retheme → nav/site-map changes → per-page restructure
   per §3 → wire new brand assets + photos → trim copy roughly (structure over polish)
3. Copy drill-down, page by page
4. Fill TBC numbers + links as they arrive
5. Glassmorphism experiment (separate rollbackable commit)
