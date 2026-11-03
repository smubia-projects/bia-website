"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AccessToken } from "@/app/lib/cms/tokens";
import { createTokenAction, revokeTokenAction } from "../../actions";
import { Modal, PageHead, useActionToast, useConfirm } from "../../_components/ui";
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
 * Personal access tokens: how Claude (or any MCP client) reaches the CMS as their
 * owner. A token has the owner's role, and stops working when it's revoked, when
 * it expires or when the owner is removed from People.
 */
export default function TokensManager({ tokens, endpoint }: { tokens: AccessToken[]; endpoint: string }) {
  const router = useRouter();
  const { handle, node } = useActionToast();
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);
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
      setAdding(false);
      router.refresh();
    }
  }

  async function revoke(t: AccessToken) {
    const yes = await confirm({ title: "Revoke Token", body: `Clients using "${t.name}" lose access immediately.`, action: "Revoke Token", danger: true });
    if (yes && handle(await revokeTokenAction(t.id), "Token revoked") !== undefined) router.refresh();
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
      <PageHead title="Access Tokens" sub="MCP access to the CMS. A token has its owner's role, and its changes are recorded under the owner's name.">
        <button type="button" className={styles.btn} onClick={() => setAdding(true)}>
          New Token
        </button>
      </PageHead>

      {adding && (
        <Modal
          title="New Token"
          onClose={() => setAdding(false)}
          onSubmit={() => name.trim() && !busy && create()}
          footer={
            <>
              <button type="button" className={styles.pill} onClick={() => setAdding(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.btn} disabled={busy || !name.trim()}>
                {busy ? "Creating…" : "Create Token"}
              </button>
            </>
          }
        >
          <label className={styles.fld}>
            Name
            <input className={styles.inp} autoFocus value={name} placeholder="Claude Code, personal laptop" onChange={(e) => setName(e.target.value)} />
            <span className={styles.hint}>Identifies the client using this token.</span>
          </label>
          <label className={styles.fld}>
            Expiry
            <select className={styles.inp} value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {LIFETIMES.map((l) => (
                <option key={l.days} value={l.days}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        </Modal>
      )}

      {created && (
        <section className={styles.panel} style={{ marginTop: 20 }}>
          <div className={styles.subItem}>
            <strong>Token shown once. Copy it before closing this panel.</strong>
            <span className={styles.hint}>Claude Code setup command:</span>
            <code style={{ display: "block", wordBreak: "break-all", fontSize: 13, lineHeight: 1.5 }}>{command}</code>
            <div className={styles.row}>
              <button type="button" className={styles.pill} onClick={copy}>
                {copied ? "Copied" : "Copy Command"}
              </button>
              <button type="button" className={styles.lnk} onClick={() => setCreated(null)}>
                Close
              </button>
            </div>
          </div>
        </section>
      )}

      <div className={styles.tableWrap} style={{ marginTop: 20 }}>
        <table className={styles.table} style={{ minWidth: 560 }}>
          <thead>
            <tr>
              <th>Token</th>
              <th>Created</th>
              <th>Last Used</th>
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
        {tokens.length === 0 && <p className={styles.emptyRow}>No tokens.</p>}
      </div>
      {node}
    </>
  );
}
