"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AccessToken } from "@/app/lib/cms/tokens";
import { createTokenAction, revokeTokenAction } from "../../actions";
import { useActionToast } from "../../_components/ui";
import styles from "../../cms.module.css";

const LIFETIMES = [
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "1 year" },
  { days: 0, label: "No expiry" },
];

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" }) : "";

/**
 * Personal access tokens: how Claude (or any MCP client) reaches the CMS as you.
 * A token does what your role can do, and stops working when it's revoked, when
 * it expires or when you're removed from People.
 */
export default function TokensManager({ tokens, endpoint }: { tokens: AccessToken[]; endpoint: string }) {
  const router = useRouter();
  const { handle, node } = useActionToast();
  const [name, setName] = useState("");
  const [days, setDays] = useState(90);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const command = created ? `claude mcp add --transport http smubia-cms ${endpoint} --header "Authorization: Bearer ${created}"` : "";

  async function create() {
    setBusy(true);
    const token = handle(await createTokenAction(name, days));
    setBusy(false);
    if (token) {
      setCreated(token);
      setCopied(false);
      setName("");
      router.refresh();
    }
  }

  async function revoke(t: AccessToken) {
    if (!confirm(`Revoke "${t.name}"? Anything using it stops working immediately.`)) return;
    if (handle(await revokeTokenAction(t.id), "Token revoked") !== undefined) router.refresh();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const status = (t: AccessToken) =>
    t.revokedAt
      ? "Revoked"
      : t.expired
        ? "Expired"
        : t.expiresAt
          ? `Expires ${day(t.expiresAt)}`
          : "No expiry";

  return (
    <>
      <h1 className={styles.h1}>Access tokens</h1>
      <p className={styles.sub}>
        Connect Claude to the CMS as you. A token can do exactly what your role can, and its changes are recorded under your name.
      </p>

      <div className={styles.panel} style={{ marginTop: 20 }}>
        <h2 className={styles.h2}>New token</h2>
        <div className={styles.grid2}>
          <label className={styles.fld}>
            Name
            <input className={styles.inp} value={name} placeholder="Claude Code on my laptop" onChange={(e) => setName(e.target.value)} />
            <span className={styles.hint}>Where you&apos;ll use it, so you know which one to revoke.</span>
          </label>
          <label className={styles.fld}>
            Expires after
            <select className={styles.inp} value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {LIFETIMES.map((l) => (
                <option key={l.days} value={l.days}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="button" className={styles.btn} style={{ alignSelf: "flex-start" }} disabled={busy || !name.trim()} onClick={create}>
          {busy ? "Creating…" : "Create token"}
        </button>
        {created && (
          <div className={styles.subItem}>
            <strong>Copy this now: it won&apos;t be shown again.</strong>
            <span className={styles.hint}>Run it in a terminal to add the CMS to Claude Code:</span>
            <code style={{ display: "block", wordBreak: "break-all", fontSize: 12.5, lineHeight: 1.5 }}>{command}</code>
            <div className={styles.row}>
              <button type="button" className={styles.pill} onClick={copy}>
                {copied ? "Copied" : "Copy command"}
              </button>
              <button type="button" className={styles.lnk} onClick={() => setCreated(null)}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={styles.tableWrap} style={{ marginTop: 20 }}>
        <table className={styles.table} style={{ minWidth: 560 }}>
          <thead>
            <tr>
              <th>Token</th>
              <th>Created</th>
              <th>Last used</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((t) => (
              <tr key={t.id}>
                <td>
                  <span className={styles.cellTitle}>{t.name}</span>
                  <div className={styles.hint}>{t.preview}…</div>
                </td>
                <td>{day(t.createdAt)}</td>
                <td>{t.lastUsedAt ? day(t.lastUsedAt) : "Never"}</td>
                <td>{status(t)}</td>
                <td className={styles.actionsCell}>
                  {!t.revokedAt && (
                    <button type="button" className={`${styles.lnk} ${styles.lnkDanger}`} onClick={() => revoke(t)}>
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tokens.length === 0 && <p className={styles.emptyRow}>No tokens yet.</p>}
      </div>
      {node}
    </>
  );
}
