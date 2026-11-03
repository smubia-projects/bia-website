"use client";

import { useState } from "react";
import Link from "next/link";
import type { Project } from "@/app/projects/data/types";
import type { Issue } from "@/app/lib/cms/newsletter";
import ProjectCover from "@/app/components/cms/ProjectCover";
import { PROJECT_STATUS_LABEL } from "@/app/lib/cms/taxonomy";
import { approveProjectAction } from "../actions";
import { PageHead, StatusChip, formatEdited, useActionToast, useConfirm } from "../_components/ui";
import { runHref } from "../_components/runs";
import styles from "../cms.module.css";

interface Props {
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

/** CMS landing page: the review queue and recent edits, then each programme's current run. */
export default function AdminHome({ canApprove, review, recent, drafts, noCohort, semester, newsletter }: Props) {
  const { handle, node } = useActionToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);

  async function approve(slug: string) {
    if (!(await confirm({ title: "Publish Project", body: "The project appears on the public site immediately.", action: "Publish Project" }))) return;
    setBusy(slug);
    handle(await approveProjectAction(slug), "Project published");
    setBusy(null);
  }

  return (
    <>
      <PageHead title="Dashboard">
        <Link href="/admin/projects/new" className={styles.btn}>
          New Project
        </Link>
      </PageHead>

      <div className={styles.cols} style={{ marginTop: 22 }}>
        <div className={`${styles.colMain} ${styles.stack}`}>
          {canApprove && (
            <section className={styles.panel}>
              <h2 className={styles.h2}>Review Queue</h2>
              {review.length === 0 ? (
                <p className={styles.emptyInline}>No projects in review.</p>
              ) : (
                review.map((p) => (
                  <ProjectRow
                    key={p.slug}
                    p={p}
                    action={
                      <button
                        type="button"
                        className={styles.lnk}
                        disabled={busy === p.slug || !p.cohortId}
                        onClick={() => approve(p.slug)}
                        title={p.cohortId ? undefined : "Semester or cohort required before publishing"}
                      >
                        Publish
                      </button>
                    }
                  />
                ))
              )}
            </section>
          )}

          <section className={styles.panel}>
            <div className={styles.between}>
              <h2 className={styles.h2}>Recently Edited</h2>
              <Link href="/admin/projects" className={styles.lnk}>
                View All Projects
              </Link>
            </div>
            {recent.length === 0 ? <p className={styles.emptyInline}>No projects.</p> : recent.map((p) => <ProjectRow key={p.slug} p={p} />)}
            {(drafts > 0 || noCohort > 0) && (
              <p className={styles.sectionHint}>
                {drafts > 0 && `${drafts} ${drafts === 1 ? "draft" : "drafts"}`}
                {drafts > 0 && noCohort > 0 && " · "}
                {noCohort > 0 && (
                  <Link className={`${styles.lnk} ${styles.lnkInline}`} href="/admin/projects?cohort=none">
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
                Open Semester
              </Link>
            </section>
          )}
          {newsletter && (
            <section className={styles.panelTight}>
              <span className={styles.monoLabel}>DAP Newsletter</span>
              <strong style={{ color: "var(--ink)" }}>{newsletter.cohortName}</strong>
              <dl className={styles.metaList}>
                <dt>Last published</dt>
                <dd>{newsletter.latest ? `Week ${newsletter.latest.week}, ${fmtDate(newsletter.latest.publishedAt)}` : "None"}</dd>
                {newsletter.scheduled && (
                  <>
                    <dt>Scheduled</dt>
                    <dd>
                      Week {newsletter.scheduled.week}, {fmtDate(newsletter.scheduled.publishAt)}
                    </dd>
                  </>
                )}
                {newsletter.drafts > 0 && (
                  <>
                    <dt>Drafts</dt>
                    <dd>{newsletter.drafts}</dd>
                  </>
                )}
              </dl>
              <Link href={runHref("DAP", newsletter.cohortSlug, "newsletter")} className={styles.pill}>
                Open Newsletter
              </Link>
            </section>
          )}
        </aside>
      </div>
      {node}
    </>
  );
}
