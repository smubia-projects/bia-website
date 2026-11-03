"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Grid3x3, LayoutGrid, SlidersHorizontal, X } from "lucide-react";
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
  { value: "cards" as Mode, label: "Cards", Icon: LayoutGrid },
  { value: "wall" as Mode, label: "Thumbnail wall", Icon: Grid3x3 },
];

/**
 * "All projects": search, a show/hide filter sidebar, and a wall / cards switch.
 * Order is shuffled per visit (so no project is always first) once the page
 * hydrates; the server renders the stable order for crawlers and no-JS visitors.
 */
export default function ProjectsExplorer({ projects }: { projects: Project[] }) {
  const searchParams = useSearchParams();
  const seed = useClientValue<number | null>(visitSeed, null);
  const [q, setQState] = useState(() => searchParams.get("q") ?? "");
  const [filters, setFiltersState] = useState<Filters>(() => ({
    programme: searchParams.getAll("programme").filter((v) => (PROGRAMMES as readonly string[]).includes(v)),
    track: searchParams.getAll("track"),
    madeFor: searchParams.getAll("madeFor"),
    builtWith: searchParams.getAll("builtWith"),
  }));

  /** Keeps search and filters in the address, so reload, Back and shared links keep them. */
  const syncUrl = (nextFilters: Filters, nextQ: string) => {
    const url = new URL(window.location.href);
    for (const key of Object.keys(nextFilters) as FacetKey[]) {
      url.searchParams.delete(key);
      nextFilters[key].forEach((v) => url.searchParams.append(key, v));
    }
    if (nextQ) url.searchParams.set("q", nextQ);
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
  };
  const setQ = (value: string) => {
    setQState(value);
    syncUrl(filters, value);
  };
  const setFilters = (next: Filters) => {
    setFiltersState(next);
    syncUrl(next, q);
  };
  // null = not chosen yet: the sidebar shows on wide screens and hides on narrow ones.
  const [filtersOpen, setFiltersOpen] = useState<boolean | null>(null);
  const [mode, setMode] = useState<Mode>("cards");

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
    setFilters({ ...filters, [key]: filters[key].includes(v) ? filters[key].filter((x) => x !== v) : [...filters[key], v] });
  const clearAll = () => {
    setFiltersState(EMPTY);
    setQState("");
    syncUrl(EMPTY, "");
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
          <div className={styles.activeRow} aria-live="polite">
              <span className={styles.resultText}>
                {narrowed ? `${results.length} of ${projects.length} projects` : `${projects.length} projects`}
              </span>
              {chips.map((c) => (
                <button key={c.key + c.v} type="button" className={styles.chip} onClick={() => toggle(c.key, c.v)} aria-label={`Remove filter ${c.v}`}>
                  {c.v}
                  <X size={12} strokeWidth={2.5} aria-hidden="true" />
                </button>
              ))}
              {narrowed && (
                <button type="button" className={styles.lnkBtn} onClick={clearAll}>
                  Clear filters
                </button>
              )}
          </div>

          {results.length === 0 ? (
            <div className={styles.empty}>No projects match these filters.</div>
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
