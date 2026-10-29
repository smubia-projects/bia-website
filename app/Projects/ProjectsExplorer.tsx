"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Project } from "@/app/Projects/data/types";
import { BUILT_WITH, MADE_FOR, PROGRAMMES } from "@/app/lib/cms/taxonomy";
import Medal from "@/app/components/cms/Medal";
import ProjectCover from "@/app/components/cms/ProjectCover";
import ProjectTile from "@/app/components/cms/ProjectTile";
import { programmeDot, shuffle, visitSeed } from "@/app/components/cms/visuals";
import styles from "@/app/components/cms/public.module.css";

type FacetKey = "programme" | "track" | "madeFor" | "builtWith";
type Filters = Record<FacetKey, string[]>;

const EMPTY: Filters = { programme: [], track: [], madeFor: [], builtWith: [] };

const facetValue = (p: Project, key: FacetKey) =>
  key === "programme" ? p.badge : key === "track" ? p.trackName ?? "" : key === "madeFor" ? p.madeFor ?? "" : p.builtWith ?? "";

/**
 * "All projects": search, faceted filters, and a Wall / Cards toggle. Order is
 * shuffled per visit (so no project is always first) once the page hydrates;
 * the server renders the stable order for crawlers and no-JS visitors.
 */
export default function ProjectsExplorer({ projects }: { projects: Project[] }) {
  const searchParams = useSearchParams();
  const [seed, setSeed] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Filters>(() => {
    const programme = searchParams.get("programme");
    return programme && (PROGRAMMES as readonly string[]).includes(programme)
      ? { ...EMPTY, programme: [programme] }
      : EMPTY;
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mode, setMode] = useState<"wall" | "cards">("wall");

  useEffect(() => setSeed(visitSeed()), []);

  const trackValues = useMemo(
    () => Array.from(new Set(projects.map((p) => p.trackName).filter(Boolean) as string[])).sort(),
    [projects]
  );

  const defs: { key: FacetKey; label: string; values: readonly string[] }[] = [
    { key: "programme", label: "Programme", values: PROGRAMMES },
    ...(trackValues.length ? [{ key: "track" as const, label: "AI Lodge track", values: trackValues }] : []),
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

  const toggle = (key: FacetKey, v: string) =>
    setFilters((f) => ({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] }));

  return (
    <>
      <div className={styles.toolbar}>
        <label className={styles.searchLabel}>
          Search projects
          <input
            className={styles.search}
            type="search"
            placeholder="Try “scam”, “students” or “agents”"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <button
          type="button"
          className={`${styles.pill} ${filtersOpen || chips.length ? styles.pillOn : ""}`}
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((o) => !o)}
        >
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6h16" />
            <path d="M7 12h10" />
            <path d="M10 18h4" />
          </svg>
          Filters{chips.length ? ` · ${chips.length}` : ""}
        </button>
        <div role="group" aria-label="View" className={styles.row} style={{ gap: 6 }}>
          <button type="button" className={`${styles.pill} ${mode === "wall" ? styles.pillOn : ""}`} aria-pressed={mode === "wall"} onClick={() => setMode("wall")}>
            Wall
          </button>
          <button type="button" className={`${styles.pill} ${mode === "cards" ? styles.pillOn : ""}`} aria-pressed={mode === "cards"} onClick={() => setMode("cards")}>
            Cards
          </button>
        </div>
        <span className={styles.resultText} aria-live="polite">
          {results.length} of {projects.length} projects · shuffled
        </span>
      </div>

      {filtersOpen && (
        <div className={styles.filterPanel}>
          <div className={styles.filterGrid}>
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
          </div>
          <div className={styles.filterActions}>
            <button type="button" className={styles.pill} onClick={() => { setFilters(EMPTY); setQ(""); }}>
              Clear all
            </button>
            <button type="button" className={styles.btn} style={{ minHeight: 40, padding: "8px 18px" }} onClick={() => setFiltersOpen(false)}>
              Show {results.length} projects
            </button>
          </div>
        </div>
      )}

      {chips.length > 0 && (
        <div className={styles.row} style={{ marginTop: 14 }}>
          {chips.map((c) => (
            <button key={c.key + c.v} type="button" className={styles.chip} onClick={() => toggle(c.key, c.v)} aria-label={`Remove filter ${c.v}`}>
              {c.v}
              <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 6l12 12" />
                <path d="M18 6 6 18" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {results.length === 0 ? (
        <div className={styles.empty}>No projects match. Remove a filter to widen the search.</div>
      ) : mode === "wall" ? (
        <>
          <div key={seed ?? "ssr"} className={`${styles.wall} ${styles.fadeIn}`}>
            {results.map((p) => {
              const winner = Boolean(p.winner) && p.badge !== "DAP";
              return (
                <Link
                  key={p.slug}
                  href={`/Projects/${p.slug}`}
                  className={`${styles.tile} ${winner ? styles.tileWinner : ""}`}
                  aria-label={`${p.title}, ${p.badge}${winner ? `, ${p.trackName ?? "track"} winner` : ""}`}
                >
                  <ProjectCover title={p.title} src={p.coverImage} aspect="1" monoSize={30} sizes="140px" />
                  <span aria-hidden="true" className={styles.tileDot} style={{ background: programmeDot(p.badge) }} />
                  {winner && <Medal size={24} className={styles.tileMedal} />}
                  <span aria-hidden="true" className={styles.tileOverlay}>
                    {p.title}
                  </span>
                </Link>
              );
            })}
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
            <span>
              <Medal size={12} />
              Track winner
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
    </>
  );
}
