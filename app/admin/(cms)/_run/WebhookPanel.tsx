"use client";

import { useState } from "react";
import type { WebhookInfo } from "@/app/lib/cms/telegram-webhook";
import { deleteWebhookAction, getWebhookInfoAction, setWebhookAction } from "../../actions";
import { useActionToast, useConfirm } from "../../_components/ui";
import styles from "../../cms.module.css";
import t from "../../tracker.module.css";

const when = (iso: string) => new Date(iso).toLocaleString("en-SG", { timeZone: "Asia/Singapore", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * The tracker bot's Telegram webhook: check what Telegram has, set it, or delete it. The bot token and
 * secret stay on the server; this only shows whether each is configured. To change the key, update
 * TELEGRAM_WEBHOOK_SECRET in the environment, redeploy, then Set Webhook.
 */
export default function WebhookPanel({ expectedUrl, tokenConfigured, secretConfigured }: { expectedUrl: string; tokenConfigured: boolean; secretConfigured: boolean }) {
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
  const chip = (ok: boolean, yes: string, no: string) => <span className={`${t.chip} ${ok ? t.chipOk : t.chipWarn}`}>{ok ? yes : no}</span>;

  return (
    <section className={styles.panel}>
      <div className={styles.sectionHead}>
        <h2 className={styles.h2}>Telegram Webhook</h2>
        <p className={styles.sectionHint}>Where Telegram delivers the bot&apos;s messages. Set Webhook removes any existing webhook, then registers it with the key in the environment. After changing TELEGRAM_WEBHOOK_SECRET, redeploy and select Set Webhook.</p>
      </div>

      <div className={t.facts}>
        <div className={t.fact}>
          <span className={t.factTitle}>Environment</span>
          <span className={styles.row}>
            Bot token {chip(tokenConfigured, "Set", "Not set")}
          </span>
          <span className={styles.row}>
            Webhook secret {chip(secretConfigured, "Set", "Not set")}
          </span>
        </div>
        <div className={t.fact}>
          <span className={t.factTitle}>Target URL</span>
          <span className={t.factValue} style={{ wordBreak: "break-all" }}>{expectedUrl}</span>
          <span className={styles.hint}>Set by NEXT_PUBLIC_SITE_URL.</span>
        </div>
        <div className={t.fact}>
          <span className={t.factTitle}>Telegram Status</span>
          {!info ? (
            <span className={styles.hint}>Not checked. Select Check Webhook.</span>
          ) : !info.tokenConfigured ? (
            <span className={styles.hint}>Bot token not set.</span>
          ) : (
            <>
              <span className={styles.row}>
                {chip(info.registered, "Registered", "Not registered")}
                {info.registered && chip(info.matches, "Matches target", "Differs from target")}
              </span>
              {info.registered && !info.matches && <span className={styles.hint} style={{ wordBreak: "break-all" }}>Posts to {info.url}</span>}
              <span className={styles.hint}>
                {info.pendingUpdates} pending update{info.pendingUpdates === 1 ? "" : "s"}
                {info.maxConnections ? ` · ${info.maxConnections} connection${info.maxConnections === 1 ? "" : "s"}` : ""}
              </span>
              {info.allowedUpdates.length > 0 && <span className={styles.hint}>Updates: {info.allowedUpdates.join(", ")}</span>}
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
        <button type="button" className={styles.btn} disabled={busy !== null || !tokenConfigured} onClick={check}>
          {busy === "check" ? "Checking…" : "Check Webhook"}
        </button>
        <button type="button" className={styles.pill} disabled={busy !== null || !ready} onClick={set}>
          {busy === "set" ? "Setting…" : "Set Webhook"}
        </button>
        <button type="button" className={`${styles.lnk} ${styles.lnkDanger}`} disabled={busy !== null || !tokenConfigured} onClick={remove}>
          {busy === "delete" ? "Deleting…" : "Delete Webhook"}
        </button>
      </div>
      {node}
    </section>
  );
}
