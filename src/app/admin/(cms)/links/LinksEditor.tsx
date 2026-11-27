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
import { PageHead, UnsavedNote, useActionToast, useSaveShortcut, useUnsavedChanges } from "../../_components/ui";
import styles from "../../cms.module.css";

const GROUPS: { group: LinkGroup; intro: string }[] = [
  { group: "Recruitment", intro: "Targets of each programme's join buttons." },
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
    handle(await saveSiteLinksAction({ links: form, applications: apps }), "Site links saved");
    setSaving(false);
  }

  useSaveShortcut(save, dirty && !saving);

  return (
    <>
      <PageHead title="Site Links" sub="Targets of the matching buttons across the site. Saved changes apply immediately.">
        <UnsavedNote
          show={dirty}
          onDiscard={() => {
            setForm(links);
            setApps(links.applications);
          }}
        />
        <button type="button" className={styles.btn} onClick={save} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </PageHead>

      {GROUPS.map(({ group, intro }) => (
        <section key={group} className={styles.panel} style={{ marginTop: 22, maxWidth: 720 }}>
          <div className={styles.sectionHead}>
            <h2 className={styles.h2}>{group}</h2>
            <p className={styles.sectionHint}>{intro}</p>
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
                    <span style={{ fontWeight: 600 }}>{programme} Applications Open</span>
                    <span className={styles.hint} style={{ display: "block" }}>
                      {target.open ? `“Join ${programme}” buttons link to ` : `Buttons read “Get ${programme} updates” and link to `}
                      {target.href}
                    </span>
                  </span>
                </label>
              );
            })}

          {EDITABLE_LINKS.filter((l) => l.group === group).map((l) => {
            const isDefault = form[l.key] === DEFAULT_LINKS[l.key];
            return (
              <div key={l.key} className={styles.fld}>
                <label htmlFor={`link-${l.key}`}>
                  {l.label}
                  {l.optional && <span className={styles.hint}> (optional)</span>}
                </label>
                <input
                  id={`link-${l.key}`}
                  className={styles.inp}
                  type={l.type === "email" ? "email" : "url"}
                  value={form[l.key]}
                  placeholder={DEFAULT_LINKS[l.key] || (l.type === "email" ? "name@example.com" : "https://")}
                  onChange={(e) => setForm((f) => ({ ...f, [l.key]: e.target.value }))}
                />
                <span className={styles.hint}>
                  {l.hint}
                  {!isDefault && DEFAULT_LINKS[l.key] && (
                    <>
                      {" · "}
                      <button
                        type="button"
                        className={`${styles.lnk} ${styles.lnkInline}`}
                        onClick={() => setForm((f) => ({ ...f, [l.key]: DEFAULT_LINKS[l.key] }))}
                      >
                        Reset to Default
                      </button>
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </section>
      ))}
      {node}
    </>
  );
}
