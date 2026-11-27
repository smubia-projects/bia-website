"use client";

import { useState } from "react";
import type { WebhookInfo } from "@/server/integrations/telegram/webhook";
import { deleteWebhookAction, getWebhookInfoAction, setWebhookAction } from "../../actions/telegram";
import { useActionToast, useConfirm } from "../../_components/ui";
import styles from "../../cms.module.css";
import t from "../../tracker.module.css";

const when = (iso: string) => new Date(iso).toLocaleString("en-SG", { timeZone: "Asia/Singapore", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * The tracker bot's Telegram webhook: check what Telegram has, set it, or delete it. The bot token and
 * secret stay on the server; this only shows whether each is configured. To change the key, update
 * TELEGRAM_WEBHOOK_SECRET in the environment, redeploy, then Set Webhook.
 */
export default function WebhookPanel({ expectedUrl, tokenConfigured, secretConfigured, polling = false }: { expectedUrl: string; tokenConfigured: boolean; secretConfigured: boolean; polling?: boolean }) {
  const { handle, node } = useActionToast();
  const confirm = useConfirm();
  const [info, setInfo] = useState<WebhookInfo | null>(null);
  const [busy, setBusy] = useState<"check" | "set" | "delete" | null>(null);

  async function check() {
    setBusy("check");
    const data = handle(await getWebhookInfoAction());
    setBusy(null);
    if (data) setInfo(data);
  }

  async function set() {
    if (info?.registered && !info.matches) {
      const yes = await confirm({ title: "Replace Webhook", body: `Telegram currently posts to ${info.url}. It is removed and replaced with ${expectedUrl}.`, action: "Set Webhook" });
      if (!yes) return;
    }
    setBusy("set");
    const data = handle(await setWebhookAction(), "Webhook set");
    setBusy(null);
    if (data) setInfo(data);
  }

  async function remove() {
    const yes = await confirm({ title: "Delete Webhook", body: "The bot stops receiving messages, so group chats cannot log tasks, blockers or meetings until the webhook is set again.", action: "Delete Webhook", danger: true });
    if (!yes) return;
    setBusy("delete");
    const data = handle(await deleteWebhookAction(), "Webhook deleted");
    setBusy(null);
    if (data) setInfo(data);
  }

  const ready = tokenConfigured && secretConfigured;
  const missing = [!tokenConfigured && "TELEGRAM_BOT_TOKEN", !secretConfigured && "TELEGRAM_WEBHOOK_SECRET"].filter(Boolean).join(" and ");
  const state = (ok: boolean, yes: string, no: string) => <span className={`${t.state} ${ok ? t.stateOk : t.stateWarn}`}>{ok ? yes : no}</span>;

  return (
    <section className={styles.panel}>
      <div className={styles.sectionHead}>
        <h2 className={styles.h2}>Telegram Webhook</h2>
        <p className={styles.sectionHint}>Where Telegram delivers the bot&apos;s messages. Set Webhook replaces any existing webhook and registers this site with the key in TELEGRAM_WEBHOOK_SECRET. After changing the key, redeploy, then set the webhook again.</p>
      </div>

      <div className={t.facts}>
        <div className={t.fact}>
          <span className={t.factTitle}>Environment</span>
          <dl className={t.kv}>
            <dt>Bot token</dt>
            <dd>{state(tokenConfigured, "Set", "Not set")}</dd>
            <dt>Webhook secret</dt>
            <dd>{state(secretConfigured, "Set", "Not set")}</dd>
          </dl>
        </div>
        <div className={t.fact}>
          <span className={t.factTitle}>Target URL</span>
          {polling ? (
            <>
              <span className={t.factValue}>Not used while polling</span>
              <span className={styles.hint} style={{ wordBreak: "break-all" }}>A deployed site registers {expectedUrl}.</span>
            </>
          ) : (
            <>
              <span className={t.factValue} style={{ wordBreak: "break-all" }}>{expectedUrl}</span>
              <span className={styles.hint}>From NEXT_PUBLIC_SITE_URL.</span>
            </>
          )}
        </div>
        <div className={t.fact}>
          <span className={t.factTitle}>Telegram Status</span>
          {polling && <span className={t.factValue}>Polling (local)</span>}
          {polling && <span className={styles.hint}>This dev server fetches the bot&apos;s updates itself; no webhook is needed. Reminders run when /api/cron/daily is opened.</span>}
          {polling ? null : !info ? (
            <span className={styles.hint}>Not checked yet.</span>
          ) : !info.tokenConfigured ? (
            <span className={styles.hint}>Bot token not set.</span>
          ) : (
            <>
              <dl className={t.kv}>
                <dt>Webhook</dt>
                <dd>{state(info.registered, "Registered", "Not registered")}</dd>
                {info.registered && (
                  <>
                    <dt>Target</dt>
                    <dd>{state(info.matches, "Matches this site", "Another address")}</dd>
                  </>
                )}
                <dt>Pending updates</dt>
                <dd className={t.num}>{info.pendingUpdates}</dd>
                {info.maxConnections ? (
                  <>
                    <dt>Connections</dt>
                    <dd className={t.num}>{info.maxConnections}</dd>
                  </>
                ) : null}
                {info.allowedUpdates.length > 0 && (
                  <>
                    <dt>Update types</dt>
                    <dd>{info.allowedUpdates.join(", ")}</dd>
                  </>
                )}
              </dl>
              {info.registered && !info.matches && <span className={styles.hint} style={{ wordBreak: "break-all" }}>Posts to {info.url}</span>}
              {info.lastError && (
                <span className={styles.hint} style={{ color: "var(--danger, #b91c1c)" }}>
                  Last error{info.lastErrorAt ? ` (${when(info.lastErrorAt)})` : ""}: {info.lastError}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <div className={styles.row}>
        <button type="button" className={styles.btn} disabled={busy !== null || !ready} onClick={set}>
          {busy === "set" ? "Setting…" : "Set Webhook"}
        </button>
        <button type="button" className={styles.pill} disabled={busy !== null || !tokenConfigured} onClick={check}>
          {busy === "check" ? "Checking…" : "Check Webhook"}
        </button>
        <button type="button" className={`${styles.lnk} ${styles.lnkDanger}`} disabled={busy !== null || !tokenConfigured} onClick={remove}>
          {busy === "delete" ? "Deleting…" : "Delete Webhook"}
        </button>
      </div>
      {!ready && <p className={styles.hint} style={{ margin: 0 }}>Set Webhook needs {missing} in the environment.</p>}
      {node}
    </section>
  );
}
