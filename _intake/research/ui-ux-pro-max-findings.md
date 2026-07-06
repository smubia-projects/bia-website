# Scout report: ui-ux-pro-max-skill repo — distilled guidance
(For Wave 9 Fable touch-up pass. Source: github.com/nextlevelbuilder/ui-ux-pro-max-skill.)

Priority ladder: Accessibility → Touch → Performance → Style → Layout → Type/Color → Animation → Forms → Nav → Charts.

## Typography
- Modular scale px: 12/14/16/18/20/24/30/36/48 — no in-between sizes. Body base 16px min (mobile <16px triggers iOS zoom).
- Leading: body 1.5–1.75 (1.625 workhorse); headlines 1.1 (hero down to 0.9); never 1.0 on body.
- Measure: 65–75ch desktop, 35–60 mobile (max-w-prose). Never full-viewport paragraphs.
- Weights: headings 600–700, body 400, labels 500. Weight signals hierarchy, not just size.
- Tracking: display -0.025em to -0.05em; small uppercase labels +0.05em+; never tighten body.
- Hero:body size ratio ~5:1 is strong (56px H1 / 16px body).
- Display fonts headlines-only; mono for code/data/prices/timers/tags — uppercase + wide tracking for labels; TABULAR FIGURES for any numbers that change (CountUp!).
- font-display: swap + metric-similar fallback.

## Spacing / layout
- 4px base, 8px rhythm: 2,4,6,8,12,16,20,24,32,40,48,56,64,80,96. Everything on-scale.
- Section tiers: component 16 / group 24-32 / section 48-96 (marketing = generous). Sibling spacing must match.
- Containers max-w-6xl/7xl; text capped at measure regardless.
- Mobile-first; test 320/375/768/1024/1440; no horizontal body scroll (wide content gets own overflow-x-auto); min-h-dvh not 100vh; reserve image space (CLS <0.1).
- Z-index managed scale 0-50 + semantic (modal 1200 etc.); never z-[9999].
- Fixed nav: body offset = nav height.

## Shadows / elevation
- ONE ladder only (site has --shadow-*): sm subtle → md hover → lg featured → 2xl hero moments. Random shadow values = AI tell.
- Radius scale consistent; match style family (no 3D/multi-layer on flat design).
- Cards: sm default, sm→md hover; modal scrim 40-60% black.

## Color
- 4.5:1 body, 3:1 large text + UI components + focus rings; per-mode testing (borders/hovers must survive both light and dark sections).
- Semantic tokens only, no raw hex in components.
- Color never the only signal (icons/text accompany status).
- Anti-patterns: gray-on-gray, #999-on-white, transparent-surface soup.

## Components
- Buttons: sm 32/12px, default 40/16px, lg 48/24px (h/padX); one PRIMARY CTA per screen, rest subordinate; disabled opacity .5, loading .7 + block double-submit.
- Inputs: visible labels (placeholder ≠ label), 44px+ height mobile, validate on blur, error below field + role="alert", correct type/inputmode/autocomplete.
- Cards: padding 24 (header 24/24/0, footer 0/24/24), gap 16.
- Focus ring global: 2px width, 2px offset, primary color; never outline:none without replacement.
- State transitions: color/bg 150ms ease-in-out, transform 200ms ease-out, shadow 200ms ease-out.
- Nav: active location highlighted; ≤5 items bottom-nav; consistent placement across pages.

## Motion
- Micro 150-300ms; complex ≤400ms; never >500ms; tap feedback within 80-150ms.
- Ease-out enter, ease-in exit; exit ~60-70% of enter; never linear.
- Animate 1-2 key elements per view MAX; stagger lists 30-50ms (≤8 children).
- transform/opacity ONLY (no width/height/top/left); will-change on animated layer then release.
- Every animation = cause→effect, interruptible, never blocks input; ALWAYS honor prefers-reduced-motion.
- Pin/scrub scroll-telling 1-2 sections per page max; parallax only decorative layers (5-15%).

## "Vibe-coded look" failure modes → fixes
- AI purple/pink gradients (#6366F1 heroes) → product-appropriate brand palette.
- Pure white flat backgrounds → tinted off-white + elevation (site already has #F6FAF8 ✓).
- Emoji as icons → one SVG family, consistent stroke 1.5-2px, token sizes (24 default). SITE MIXES React Icons + Lucide — consolidate.
- Raw hex in components → tokens.
- Random spacing/shadows/z-index → scales.
- Everything animates → restraint + reduced-motion.
- Placeholder-only labels; validate-on-submit-only → visible labels, blur validation.
- Layout-shifting hover → color/opacity/elevation for press.
- CLS from images/fonts → reserve space, swap + fallback.
- Full-width paragraphs, <16px mobile body → measure + base size.
- Icon-only buttons w/o aria-label; removed focus rings → fix.

## Top 12 for SMUBIA (light #F6FAF8 base, pine anchors, mint/sand, Bricolage/Inter/Roboto Mono)
1. One shadow ladder sitewide: sm cards / md hover / lg featured — kill ad-hoc values.
2. Verify every color pairing per section type (light + pine + dusk): 4.5:1 body, 3:1 large/UI; borders/hover/focus visible in ALL section temperatures.
3. Lock the modular type scale; 16px body, 1.5-1.75 leading; 65-75ch measure; display tight leading + negative tracking; eyebrows uppercase + wide tracking.
4. Hierarchy via weight+size (~4-5:1 hero:body), accents never the sole signal.
5. 8px rhythm everywhere; consistent section tiers (24 in-card, 48-96 between sections); sibling spacing identical.
6. ONE primary CTA per view (Join = the money action); demote secondaries to outline/ghost.
7. Roboto Mono eyebrows: 12px uppercase wide-tracked; tabular figures on all stats/CountUp.
8. ScrollReveal: 150-300ms transform/opacity ease-out, 1-2 elements/section, 30-50ms staggers, prefers-reduced-motion (likely current a11y gap).
9. Icon discipline: consolidate to one family, one stroke width, token sizes, aria-labels.
10. Focus rings: visible 2px/2px (emerald on light, mint on dark/dusk) — glassy nav must not strip them.
11. Forms: visible labels, inputmode, blur validation, error below field, submit-loading state.
12. Mobile: ≥44px targets + 8px gaps, min-h-dvh, no body horizontal scroll (reels/tables in own scroll containers).
