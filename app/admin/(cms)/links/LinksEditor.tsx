"use client";

import { useState } from "react";
import {
  DEFAULT_LINKS,
  EDITABLE_LINKS,
  joinLink,
  type Applications,
  type LinkGroup,
  type LinkKey,
  type SiteLinks,
} from "@/app/lib/links";
import { saveSiteLinksAction } from "../../actions";
import { useActionToast, useUnsavedChanges } from "../../_components/ui";
import styles from "../../cms.module.css";

const GROUPS: { group: LinkGroup; intro: string }[] = [
  { group: "Recruitment", intro: "Where each programme's join buttons go." },
  { group: "Club", intro: "General club links." },
  { group: "Contact", intro: "Shown on Contact and Work with us." },
  { group: "Socials", intro: "Footer icons." },
];

const SWITCHES: { key: keyof Applications; programme: "DAP" | "AI Lodge" }[] = [
  { key: "dap", programme: "DAP" },
  { key: "aiLodge", programme: "AI Lodge" },
];

export default function LinksEditor({ links }: { links: SiteLinks }) {
  const { handle, node } = useActionToast();
  const [form, setForm] = useState<Record<LinkKey, string>>(links);
  const [apps, setApps] = useState<Applications>(links.applications);
  const [saving, setSaving] = useState(false);
  const dirty =
    EDITABLE_LINKS.some((l) => form[l.key] !== links[l.key]) ||
    apps.dap !== links.applications.dap ||
    apps.aiLodge !== links.applications.aiLodge;
  const preview: SiteLinks = { ...form, applications: apps };
  useUnsavedChanges(dirty && !saving);

  async function save() {
    setSaving(true);
    handle(await saveSiteLinksAction({ links: form, applications: apps }));
    setSaving(false);
  }

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.h1}>Site links</h1>
          <p className={styles.sub}>
            Every button on the site that points to these places uses what is saved here. Changes go live straight away.
          </p>
        </div>
        <button type="button" className={styles.btn} onClick={save} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {GROUPS.map(({ group, intro }) => (
        <section key={group} className={styles.panel} style={{ marginTop: 22, maxWidth: 720 }}>
          <div>
            <h2 className={styles.h2}>{group}</h2>
            <p className={styles.hint} style={{ margin: "4px 0 0", fontSize: 13 }}>
              {intro}
            </p>
          </div>

          {group === "Recruitment" &&
            SWITCHES.map(({ key, programme }) => {
              const target = joinLink(preview, programme);
              return (
                <label key={key} className={styles.radio} style={{ alignItems: "flex-start" }}>
                  <input
                    type="checkbox"
                    checked={apps[key]}
                    onChange={(e) => setApps((a) => ({ ...a, [key]: e.target.checked }))}
                    style={{ marginTop: 2 }}
                  />
                  <span>
                    <span style={{ fontWeight: 600 }}>{programme} applications are open</span>
                    <span className={styles.hint} style={{ display: "block" }}>
                      {target.open ? `“Join ${programme}” buttons` : `Buttons read “Get ${programme} updates” and`} go to {target.href}
                    </span>
                  </span>
                </label>
              );
            })}

          {EDITABLE_LINKS.filter((l) => l.group === group).map((l) => {
            const isDefault = form[l.key] === DEFAULT_LINKS[l.key];
            return (
              <label key={l.key} className={styles.fld}>
                {l.label}
                {l.optional && <span className={styles.hint}> (optional)</span>}
                <input
                  className={styles.inp}
                  type={l.type === "email" ? "email" : "url"}
                  value={form[l.key]}
                  placeholder={DEFAULT_LINKS[l.key] || (l.type === "email" ? "name@example.com" : "https://…")}
                  onChange={(e) => setForm((f) => ({ ...f, [l.key]: e.target.value }))}
                />
                <span className={styles.hint}>
                  {l.hint}
                  {!isDefault && DEFAULT_LINKS[l.key] && (
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
      ))}
      {node}
    </>
  );
}
