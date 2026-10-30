"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Programme } from "@/app/lib/cms/taxonomy";
import { yearbookPath } from "@/app/lib/cms/paths";
import { createCohortAction } from "../../actions";
import { useActionToast } from "../../_components/ui";
import { RUN_NOUN, runHref } from "../../_components/runs";
import styles from "../../cms.module.css";

/** "AY26/27 Semester 2" → "ay2627-s2", "AY26/27 cohort" → "ay2627" */
function suggestSlug(name: string, isLodge: boolean) {
  const ay = name.match(/AY\s*(\d{2})\s*\/?\s*(\d{2})/i);
  const sem = name.match(/(?:semester|sem|s)\s*(\d)/i);
  if (ay) return `ay${ay[1]}${ay[2]}${isLodge && sem ? `-s${sem[1]}` : ""}`;
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Starts a new AI Lodge semester or DAP cohort, then opens it. */
export default function NewRunForm({ programme, canEdit, isFirst }: { programme: Programme; canEdit: boolean; isFirst: boolean }) {
  const router = useRouter();
  const { handle, node } = useActionToast();
  const isLodge = programme === "AI Lodge";
  const noun = RUN_NOUN[programme];
  const [draft, setDraft] = useState({ slug: "", name: "", slugEdited: false });
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const id = handle(await createCohortAction(programme, draft.slug, draft.name), `${draft.name} created`);
    setBusy(false);
    if (id) {
      router.push(runHref(programme, draft.slug));
      router.refresh();
    }
  }

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.h1}>New {isLodge ? "AI Lodge semester" : "DAP cohort"}</h1>
          <p className={styles.sub}>
            {isFirst
              ? `There is no ${noun} yet. Create the first one to start adding ${isLodge ? "tracks, lodges and projects" : "groups, the schedule and the newsletter"}.`
              : isLodge
                ? "A semester has its own yearbook page, Hack Day tracks, lodges and projects."
                : "A cohort has its own page with the newsletter, co-learning schedule and groups, plus a yearbook of its projects."}
          </p>
        </div>
      </div>
      <div className={styles.panel} style={{ marginTop: 22, maxWidth: 640 }}>
        <div className={styles.grid2}>
          <label className={styles.fld}>
            Name
            <input
              className={styles.inp}
              value={draft.name}
              placeholder={isLodge ? "AY26/27 Semester 2" : "AY26/27 cohort"}
              disabled={!canEdit}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value, slug: d.slugEdited ? d.slug : suggestSlug(e.target.value, isLodge) }))}
            />
          </label>
          <label className={styles.fld}>
            URL name
            <input
              className={styles.inp}
              value={draft.slug}
              placeholder={isLodge ? "ay2627-s2" : "ay2627"}
              disabled={!canEdit}
              onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value.toLowerCase(), slugEdited: true }))}
            />
            <span className={styles.hint}>
              Used in the address, e.g. {yearbookPath(programme)}/{draft.slug || (isLodge ? "ay2627-s2" : "ay2627")}
              {isLodge ? "" : ` and /dap/${draft.slug || "ay2627"}`}
            </span>
          </label>
        </div>
        <div className={styles.row}>
          <button type="button" className={styles.btn} onClick={create} disabled={!canEdit || busy || !draft.slug || !draft.name}>
            {busy ? "Creating…" : `Create ${noun}`}
          </button>
        </div>
        {!isLodge && <span className={styles.hint}>New DAP cohorts start with a blank 10-week co-learning schedule.</span>}
        {!canEdit && <span className={styles.hint}>Your role can&apos;t add a {noun}. Ask exco.</span>}
      </div>
      {node}
    </>
  );
}
