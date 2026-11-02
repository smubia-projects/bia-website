"use client";

import { useState } from "react";
import Link from "next/link";
import type { Project } from "@/app/projects/data/types";
import type { Issue } from "@/app/lib/cms/newsletter";
import ProjectCover from "@/app/components/cms/ProjectCover";
import { PROJECT_STATUS_LABEL } from "@/app/lib/cms/taxonomy";
import { approveProjectAction } from "../actions";
import { StatusChip, formatEdited, useActionToast } from "../_components/ui";
import { runHref } from "../_components/runs";
import styles from "../cms.module.css";

interface Props {
  name: string;
  canApprove: boolean;
  review: Project[];
  recent: Project[];
  drafts: number;
  noCohort: number;
  semester: { slug: string; name: string; projects: number } | null;
  newsletter: { cohortSlug: string; cohortName: string; latest: Issue | null; scheduled: Issue | null; drafts: number } | null;
}

const fmtDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", timeZone: "Asia/Singapore" }).format(new Date(iso)) : "";

function ProjectRow({ p, action }: { p: Project; action?: React.ReactNode }) {
  return (
    <div className={styles.projRow}>
      <span className={styles.thumb} style={{ width: 44 }}>
        <ProjectCover title={p.title} src={p.coverImage} aspect="52 / 34" monoSize={12} sizes="44px" />
      </span>
      <Link href={`/admin/projects/${p.slug}`} className={styles.projRowTitle}>
        {p.title}
      </Link>
      <span className={styles.hint}>{formatEdited(p.updatedAt)}</span>
      <StatusChip status={p.status ?? "draft"} label={PROJECT_STATUS_LABEL[p.status ?? "draft"]} />
      {action}
    </div>
  );
}

/** CMS landing page: what needs attention, then shortcuts. */
export default function AdminHome({ name, canApprove, review, recent, drafts, noCohort, semester, newsletter }: Props) {
  const { handle, node } = useActionToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function approve(slug: string) {
    setBusy(slug);
    handle(await approveProjectAction(slug), "Published");
    setBusy(null);
  }

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.h1}>Welcome back{name && !name.includes("@") ? `, ${name.split(" ")[0]}` : ""}</h1>
          <p className={styles.sub}>What needs attention across the site.</p>
        </div>
        <Link href="/admin/projects/new" className={styles.btn}>
          New project
        </Link>
      </div>

      <div className={styles.cols} style={{ marginTop: 22 }}>
        <div className={styles.colMain} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {canApprove && (
            <section className={styles.panel}>
              <h2 className={styles.h2}>Waiting for review</h2>
              {review.length === 0 ? (
                <p className={styles.hint} style={{ margin: 0, fontSize: 14 }}>
                  Nothing to review. Projects that DAP exco and AI Lodge exco submit show up here.
                </p>
              ) : (
                review.map((p) => (
                  <ProjectRow
                    key={p.slug}
                    p={p}
                    action={
                      <button type="button" className={styles.lnk} disabled={busy === p.slug || !p.cohortId} onClick={() => approve(p.slug)} title={p.cohortId ? undefined : "Pick a semester or cohort first"}>
                        Approve
                      </button>
                    }
                  />
                ))
              )}
            </section>
          )}

          <section className={styles.panel}>
            <div className={styles.between}>
              <h2 className={styles.h2}>Recently edited</h2>
              <Link href="/admin/projects" className={styles.lnk}>
                All projects
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className={styles.hint} style={{ margin: 0, fontSize: 14 }}>
                No projects yet.
              </p>
            ) : (
              recent.map((p) => <ProjectRow key={p.slug} p={p} />)
            )}
            {(drafts > 0 || noCohort > 0) && (
              <p className={styles.hint} style={{ margin: 0, fontSize: 13 }}>
                {drafts > 0 && `${drafts} ${drafts === 1 ? "draft" : "drafts"}`}
                {drafts > 0 && noCohort > 0 && " · "}
                {noCohort > 0 && (
                  <Link className={styles.lnk} style={{ padding: 0, minHeight: 0, fontSize: "inherit" }} href="/admin/projects?cohort=none">
                    {noCohort} without a semester or cohort
                  </Link>
                )}
              </p>
            )}
          </section>
        </div>

        <aside className={styles.colSide} style={{ position: "static" }}>
          {semester && (
            <section className={styles.panelTight}>
              <span className={styles.monoLabel}>AI Lodge</span>
              <strong style={{ color: "var(--ink)" }}>{semester.name}</strong>
              <span className={styles.hint}>
                {semester.projects} {semester.projects === 1 ? "project" : "projects"}
              </span>
              <Link href={runHref("AI Lodge", semester.slug)} className={styles.pill}>
                Open semester
              </Link>
            </section>
          )}
          {newsletter && (
            <section className={styles.panelTight}>
              <span className={styles.monoLabel}>This week in DAP · {newsletter.cohortName}</span>
              <span className={styles.hint} style={{ fontSize: 13 }}>
                {newsletter.latest ? `Last published: Week ${newsletter.latest.week}, ${fmtDate(newsletter.latest.publishedAt)}` : "Nothing published yet"}
              </span>
              {newsletter.scheduled && (
                <span className={styles.hint} style={{ fontSize: 13 }}>
                  Scheduled: Week {newsletter.scheduled.week}, {fmtDate(newsletter.scheduled.publishAt)}
                </span>
              )}
              {newsletter.drafts > 0 && (
                <span className={styles.hint} style={{ fontSize: 13 }}>
                  {newsletter.drafts} {newsletter.drafts === 1 ? "draft" : "drafts"}
                </span>
              )}
              <Link href={runHref("DAP", newsletter.cohortSlug, "newsletter")} className={styles.pill}>
                Open newsletter
              </Link>
            </section>
          )}
        </aside>
      </div>
      {node}
    </>
  );
}
