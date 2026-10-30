"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_LINKS, EDITABLE_LINKS, type SiteLinks } from "@/app/lib/links";
import { saveSiteLinksAction } from "../../actions";
import { useActionToast } from "../../_components/ui";
import styles from "../../cms.module.css";

export default function LinksEditor({ links }: { links: SiteLinks }) {
  const router = useRouter();
  const { handle, node } = useActionToast();
  const [form, setForm] = useState<SiteLinks>(links);
  const [saving, setSaving] = useState(false);
  const dirty = EDITABLE_LINKS.some((l) => form[l.key] !== links[l.key]);

  async function save() {
    setSaving(true);
    const ok = handle(await saveSiteLinksAction(form));
    setSaving(false);
    if (ok !== undefined) router.refresh();
  }

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.h1}>Site links</h1>
          <p className={styles.sub}>
            Every button on the site that points to these places uses the link saved here. Changes go live straight away.
          </p>
        </div>
        <button type="button" className={styles.btn} onClick={save} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save links"}
        </button>
      </div>

      <section className={styles.panel} style={{ marginTop: 22, maxWidth: 720 }}>
        {EDITABLE_LINKS.map((l) => {
          const isDefault = form[l.key] === DEFAULT_LINKS[l.key];
          return (
            <label key={l.key} className={styles.fld}>
              {l.label}
              <input
                className={styles.inp}
                type="url"
                value={form[l.key]}
                placeholder={DEFAULT_LINKS[l.key]}
                onChange={(e) => setForm((f) => ({ ...f, [l.key]: e.target.value }))}
              />
              <span className={styles.hint}>
                {l.hint}
                {!isDefault && (
                  <>
                    {" · "}
                    <button
                      type="button"
                      className={styles.lnk}
                      style={{ padding: 0, minHeight: 0, fontSize: "inherit" }}
                      onClick={() => setForm((f) => ({ ...f, [l.key]: DEFAULT_LINKS[l.key] }))}
                    >
                      Reset to default
                    </button>
                  </>
                )}
              </span>
            </label>
          );
        })}
      </section>
      {node}
    </>
  );
}
