"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Grid3x3, LayoutGrid, SlidersHorizontal } from "lucide-react";
import type { Project } from "@/app/projects/data/types";
import { projectPath } from "@/app/lib/cms/paths";
import { BUILT_WITH, MADE_FOR, PROGRAMMES } from "@/app/lib/cms/taxonomy";
import ProjectCover from "@/app/components/cms/ProjectCover";
import ProjectTile from "@/app/components/cms/ProjectTile";
import ViewToggle from "@/app/components/cms/ViewToggle";
import { programmeDot, shuffle, visitSeed } from "@/app/components/cms/visuals";
import { useClientValue, useMediaQuery } from "@/app/components/ui/useClient";
import styles from "@/app/components/cms/public.module.css";

type FacetKey = "programme" | "track" | "madeFor" | "builtWith";
type Filters = Record<FacetKey, string[]>;
type Mode = "wall" | "cards";

const EMPTY: Filters = { programme: [], track: [], madeFor: [], builtWith: [] };

const facetValue = (p: Project, key: FacetKey) =>
  key === "programme" ? p.badge : key === "track" ? p.trackName ?? "" : key === "madeFor" ? p.madeFor ?? "" : p.builtWith ?? "";

const VIEWS = [
  { value: "wall" as Mode, label: "Thumbnail wall", Icon: Grid3x3 },
  { value: "cards" as Mode, label: "Cards", Icon: LayoutGrid },
];

/**
 * "All projects": search, a show/hide filter sidebar, and a wall / cards switch.
 * Order is shuffled per visit (so no project is always first) once the page
 * hydrates; the server renders the stable order for crawlers and no-JS visitors.
 */
export default function ProjectsExplorer({ projects }: { projects: Project[] }) {
  const searchParams = useSearchParams();
  const seed = useClientValue<number | null>(visitSeed, null);
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Filters>(() => {
    const programme = searchParams.get("programme");
    return programme && (PROGRAMMES as readonly string[]).includes(programme)
      ? { ...EMPTY, programme: [programme] }
      : EMPTY;
  });
  // null = not chosen yet: the sidebar shows on wide screens and hides on narrow ones.
  const [filtersOpen, setFiltersOpen] = useState<boolean | null>(null);
  const [mode, setMode] = useState<Mode>("wall");

  const wide = useMediaQuery("(min-width: 1024px)");
  const open = filtersOpen ?? wide;

  const trackValues = useMemo(
    () => Array.from(new Set(projects.map((p) => p.trackName).filter(Boolean) as string[])).sort(),
    [projects]
  );

  const defs: { key: FacetKey; label: string; values: readonly string[] }[] = [
    { key: "programme", label: "Programme", values: PROGRAMMES },
    ...(trackValues.length ? [{ key: "track" as const, label: "Hack Day track", values: trackValues }] : []),
    { key: "madeFor", label: "Made for", values: MADE_FOR },
    { key: "builtWith", label: "Built with", values: BUILT_WITH },
  ];

  const query = q.trim().toLowerCase();
  const matches = (p: Project, except?: FacetKey) => {
    for (const key of Object.keys(filters) as FacetKey[]) {
      if (key === except || filters[key].length === 0) continue;
      if (!filters[key].includes(facetValue(p, key))) return false;
    }
    if (!query) return true;
    return [p.title, p.description, p.builtWith, p.madeFor, p.trackName]
      .join(" ")
      .toLowerCase()
      .includes(query);
  };

  const filtered = projects.filter((p) => matches(p));
  const results = seed === null ? filtered : shuffle(filtered, seed);
  const chips = defs.flatMap((d) => filters[d.key].map((v) => ({ key: d.key, v })));
  const narrowed = chips.length > 0 || query.length > 0;

  const toggle = (key: FacetKey, v: string) =>
    setFilters((f) => ({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] }));
  const clearAll = () => {
    setFilters(EMPTY);
    setQ("");
  };

  const layout = filtersOpen === null ? styles.explorerAuto : filtersOpen ? styles.explorerOpen : styles.explorerClosed;

  return (
    <>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={`${styles.pill} ${open ? styles.pillOn : ""}`}
          aria-expanded={open}
          aria-controls="project-filters"
          onClick={() => setFiltersOpen(!open)}
        >
          <SlidersHorizontal size={15} strokeWidth={2} aria-hidden />
          {open ? "Hide filters" : "Show filters"}
          {chips.length > 0 && <span className={styles.pillCount}>{chips.length}</span>}
        </button>
        <input
          className={styles.search}
          type="search"
          aria-label="Search projects"
          placeholder="Search projects"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className={styles.toolbarEnd}>
          <ViewToggle options={VIEWS} value={mode} onChange={setMode} />
        </div>
      </div>

      <div className={`${styles.explorer} ${layout}`}>
        <aside id="project-filters" className={styles.filterSide} aria-label="Filters">
          {defs.map((d) => (
            <fieldset key={d.key} className={styles.fieldset}>
              <legend className={styles.legendLabel}>{d.label}</legend>
              {d.values.map((v) => {
                const n = projects.filter((p) => matches(p, d.key) && facetValue(p, d.key) === v).length;
                const on = filters[d.key].includes(v);
                return (
                  <label key={v} className={styles.opt} style={{ opacity: n || on ? 1 : 0.45 }}>
                    <input type="checkbox" checked={on} onChange={() => toggle(d.key, v)} />
                    <span>{v}</span>
                    <span className={styles.optCount}>{n}</span>
                  </label>
                );
              })}
            </fieldset>
          ))}
        </aside>

        <div className={styles.results}>
          {narrowed && (
            <div className={styles.activeRow} aria-live="polite">
              <span className={styles.resultText}>
                {results.length} of {projects.length} projects
              </span>
              {chips.map((c) => (
                <button key={c.key + c.v} type="button" className={styles.chip} onClick={() => toggle(c.key, c.v)} aria-label={`Remove filter ${c.v}`}>
                  {c.v}
                  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M6 6l12 12" />
                    <path d="M18 6 6 18" />
                  </svg>
                </button>
              ))}
              <button type="button" className={styles.lnkBtn} onClick={clearAll}>
                Clear all
              </button>
            </div>
          )}

          {results.length === 0 ? (
            <div className={styles.empty}>No projects match. Remove a filter to widen the search.</div>
          ) : mode === "wall" ? (
            <>
              <div key={seed ?? "ssr"} className={`${styles.wall} ${styles.fadeIn}`}>
                {results.map((p) => (
                  <Link key={p.slug} href={projectPath(p)} className={styles.tile} aria-label={`${p.title}, ${p.badge}`}>
                    <ProjectCover title={p.title} src={p.coverImage} aspect="1" monoSize={30} sizes="140px" />
                    <span aria-hidden="true" className={styles.tileDot} style={{ background: programmeDot(p.badge) }} />
                    <span aria-hidden="true" className={styles.tileOverlay}>
                      {p.title}
                    </span>
                  </Link>
                ))}
              </div>
              <div className={styles.legend}>
                <span>
                  <span className={styles.legendDot} style={{ background: programmeDot("AI Lodge") }} />
                  AI Lodge
                </span>
                <span>
                  <span className={styles.legendDot} style={{ background: programmeDot("DAP") }} />
                  DAP
                </span>
              </div>
            </>
          ) : (
            <div key={seed ?? "ssr"} className={`${styles.cardsGrid} ${styles.fadeIn}`}>
              {results.map((p) => (
                <ProjectTile key={p.slug} project={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
