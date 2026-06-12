# SMUBIA Design System

The design language for www.smubia.com (SMU Business Intelligence & Analytics Club).
Established in the June 2026 redesign. Any new page, component or styling change
must follow this document. All values below exist as CSS variables in
`app/globals.css` and are mapped into Tailwind in `tailwind.config.ts`.

## 1. Visual Theme & Atmosphere

**"Light base, dark pine anchors."** The site reads light, fresh and approachable —
a green-tinted off-white paper — punctuated by deep pine-green sections that carry
gravitas: the home hero, DAP showcase bands, application/contact CTAs and the
footer. Dark sections are where the brand mint glows; they make flagship content
(DAP, partnership pitches) feel premium and sought-after.

Tone targets: **inclusive and student-friendly, but professional enough for
corporate sponsors.** Never "terminal hacker" (the pre-2026 site was all-black),
never gimmicky. The astro-cat mascot (`public/images/biaMascot.png`) supplies
personality; use it sparingly — hero moments only, with the gentle `float`
animation.

## 2. Color Palette

### Light base (most sections)
| Token | Hex | Role |
|---|---|---|
| `--bg` | `#F6FAF8` | Page background (soft mint-white) |
| `--surface` | `#FFFFFF` | Cards, tables, inputs' parent surfaces |
| `--surface-muted` | `#EDF5F1` | Tinted bands, hover fills, alternate sections |
| `--border` | `#DCE7E2` | Hairline borders everywhere on light |
| `--ink` | `#12352C` | Headings, strong text |
| `--ink-soft` | `#3D5A50` | Body text |
| `--ink-faint` | `#6B847B` | Captions, meta, labels |

### Dark pine anchors (hero, DAP bands, footer, CTA bands)
| Token | Hex | Role |
|---|---|---|
| `--pine-deep` | `#0C211C` | Dark section background — **never pure black** |
| `--pine-surface` | `#16302A` | Cards on dark |
| `--pine-border` | `#24433B` | Hairlines on dark |
| `--pine-text` | `#E8F4EF` | Headings on dark |
| `--pine-text-soft` | `#9DBBB1` | Body on dark |

### Accents
| Token | Hex | Role |
|---|---|---|
| `--mint` | `#7DD7C2` | **The bia colour.** Headline accents, buttons and glows on DARK backgrounds only |
| `--mint-soft` | `rgba(125,215,194,0.12)` | Tinted chip/badge/hover fill on light |
| `--emerald` | `#0E7C5B` | The accent on LIGHT backgrounds: links, buttons, eyebrows (5.6:1 on white) |
| `--emerald-strong` | `#0A5F46` | Emerald hover state |
| `--sky` | `#7BD1FA` | Secondary, sparing (tech tags at ~22% opacity fills) |
| `--gold` / `--gold-deep` | `#E9C400` / `#8A7400` | AI Lodge badges: gold tint fill + gold-deep text on light |
| Destructive | `#B91C1C` text, `rgba(220,38,38,…)` fills | Delete/error states (admin) |

**The cardinal rule: mint `#7DD7C2` is never used as text or icon color on light
backgrounds — it fails contrast. On light, the accent is emerald.** Mint appears on
light only as `--mint-soft` background fills behind emerald text.

## 3. Typography

| Font | Variable | Weights | Use |
|---|---|---|---|
| Bricolage Grotesque | `--font-display` | 600/700/800 | All headings, stat numbers, card titles |
| Inter | `--font-inter` | 400/500/600 | Body, UI, buttons (600 for button labels) |
| Roboto Mono | `--font-roboto-mono` | 400/500 | Eyebrows, stat labels, meta rows ONLY |

Loaded via `next/font/google` in `app/layout.tsx`. Scale conventions:
- Hero H1: `clamp(2.25rem, …, 4.75rem)`, weight 800, `letter-spacing: -0.02em`, `line-height ~1.06`
- Section H2: `clamp(1.75rem, …, 2.75rem)`, weight 700 (use the `SectionHeading` component)
- Card titles: 1.125–1.375rem, weight 700, display font
- Body: 0.9375–1.0625rem, `line-height 1.6–1.7`, `--ink-soft`
- Eyebrow: 0.75rem mono, uppercase, `letter-spacing: 0.12em` — emerald on light, mint on dark (`.eyebrow` / `.eyebrowOnDark` globals)

## 4. Component Styling

Shared primitives live in `app/components/ui/` — use them before writing new ones:
- **`Button`** — variants: `primary` (emerald bg/white text, light sections), `onDark`
  (mint bg/pine text, dark sections), `outline` / `outlineOnDark` (hairline).
  Pill radius, 600 weight, hover = `translateY(-2px)` + `--shadow-md`, 200–250ms ease.
- **`SectionHeading`** — eyebrow + display title + lede; `tone="light"|"dark"`,
  `align="left"|"center"`. Every section opens with one.
- **`ScrollReveal`** — IntersectionObserver fade+rise (700ms, fires once); accepts
  `delay` for 75–150ms stagger across card grids.
- **`CountUp`** — eased count-up for stat numbers, triggers once on scroll.
- **`RotatingWord`** — hero word rotator (2.5s hold / 400ms fade), mint on dark.

Cards (the default content unit on light): white `--surface`, 1px `--border`,
`--radius-lg` (16px), `--shadow-sm`; hover lifts 2–3px to `--shadow-md` and the
border warms to `rgba(14,124,91,0.35)`. Badges/chips: pill radius, `--mint-soft`
fill + emerald text (DAP), gold tint + `--gold-deep` text (AI Lodge).

Forms (admin): inputs on `--bg` with `--border`; focus = emerald border +
`0 0 0 3px var(--mint-soft)` ring. Destructive actions use the red scale, never gold.

## 5. Layout Principles

- Content max-width: **76rem** (`max-width: 76rem; margin: 0 auto; padding: 0 1.25rem`).
  Projects/admin use narrower 1200px/960px containers.
- Section rhythm: `padding: 4.5–5.5rem 1.25rem`; alternate plain `--bg` sections with
  `--surface-muted` bands (which take 1px top+bottom `--border`) and dark pine anchors.
- Pages must clear the fixed 4rem nav (`padding-top` on the page shell; heroes use
  ~9.5–10rem total top padding).
- Grids: 3-column card grids on desktop collapsing to 1 column (`@media (min-width: 768px)`),
  4-column for compact cards (events, stats) via 640px/1024px steps.
- Generous whitespace over density. Hairline rules (1px `--border` / `--pine-border`)
  separate stats strips and footers — never heavy dividers.

## 6. Depth & Elevation

Green-tinted layered shadows only (no plain black shadows):
- `--shadow-xs` → flat chrome (nav, stat tiles)
- `--shadow-sm` → resting cards
- `--shadow-md` → hover state, hero images, CTA boxes
- `--shadow-lg` → modals, detail-page carousel

Radius scale: `--radius-sm` 8 / `--radius-md` 12 / `--radius-lg` 16 (cards) /
`--radius-xl` 24 (feature cards) / `--radius-pill` for buttons, chips, filters.
On dark sections, depth comes from the `.glow-mint` radial halo
(`rgba(125,215,194,~0.15)` ellipse) behind headlines — not shadows.

## 7. Motion

**Refined & subtle.** 200–300ms eases; transition `transform`, `box-shadow`,
`color`, `background-color` only.
- Scroll: `ScrollReveal` fade+rise, once per element, staggered ≤150ms
- Stats: `CountUp` on first view
- Hero: `RotatingWord` cycle + mascot `float` (6s ease-in-out, ±12px)
- Hovers: 2–3px lift + shadow deepen; link color shifts
- **Banned:** parallax, marquees, cursor effects, scroll-pinning, scale-on-hover
  larger than 1.05. Respect `prefers-reduced-motion` (float/scroll-behavior disabled).

## 8. Responsive Behavior

Breakpoints: 640 / 768 / 1024px (nav switches to hamburger below 1024).
- Mobile nav: white slide-down panel, links + Join button
- Hero: mascot stacks below text; tier table → stacked per-tier cards (<768px)
- Type scales via `clamp()` — no breakpoint font overrides
- No horizontal overflow at 360px wide; touch targets ≥ 2.5rem

## 9. Do's and Don'ts

**Do**
- Route every join/apply/contact CTA through `app/lib/links.ts`
- Open dark anchor sections for flagship/premium content (DAP, sponsorships)
- Use the white logo as-is on dark; on light, tint it via the nav's CSS filter
- Keep `/admin` on the same light system (crop canvas stays `--pine-deep` for contrast)
- Put editable content in `data.ts` files (`WorkWithUs/data.ts`, `DAP/data.ts`, `WhatWeDo/datathonData.ts`)

**Don't**
- Use pure black anywhere — dark means `--pine-deep`
- Put mint text on light backgrounds (use emerald)
- Reintroduce Bootstrap, hardcode hexes that exist as tokens, or add new fonts
- Use gold for anything except AI Lodge badges
- Add motion beyond §7 — corporate sponsors browse this site
