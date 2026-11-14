"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTelegramLinkAction, unlinkTelegramAction } from "../../actions";
import { PageHead, useActionToast, useConfirm } from "../../_components/ui";
import styles from "../../cms.module.css";
import t from "../../tracker.module.css";

/**
 * Links the signed-in admin's Telegram account, so the tracker bot recognises them in group chats.
 * Only the numeric Telegram user ID is stored, never the username.
 */
export default function TelegramLink({ telegramId, botName }: { telegramId: number | null; botName: string }) {
  const router = useRouter();
  const { handle, node } = useActionToast();
  const confirm = useConfirm();
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    const url = handle(await createTelegramLinkAction());
    setBusy(false);
    if (url) {
      setLink(url);
      setCopied(false);
    }
  }

  async function unlink() {
    if (!(await confirm({ title: "Unlink Telegram", body: "The bot stops treating this Telegram account as DAP exco until it is linked again.", action: "Unlink Telegram", danger: true }))) return;
    setBusy(true);
    const data = handle(await unlinkTelegramAction());
    setBusy(false);
    if (data !== undefined) {
      setLink(null);
      router.refresh();
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link ?? "");
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={styles.stack}>
      <PageHead title="Telegram" sub="Links your Telegram account to the DAP timeline tracker bot. Admin commands then work in every registered group chat." />

      <section className={styles.panel}>
        <h2 className={styles.h2}>Account Link</h2>
        <div className={t.facts}>
          <div className={t.fact}>
            <span className={t.factTitle}>Status</span>
            <span className={t.factValue}>{telegramId ? "Linked" : "Not linked"}</span>
            <span className={styles.hint}>{telegramId ? `Telegram user ID ${telegramId}.` : "No Telegram account is linked to this CMS account."}</span>
          </div>
          <div className={t.fact}>
            <span className={t.factTitle}>Bot</span>
            <span className={t.factValue}>{botName ? `@${botName}` : "Not configured"}</span>
            <span className={styles.hint}>{botName ? "Set by TELEGRAM_BOT_USERNAME." : "TELEGRAM_BOT_USERNAME is not set."}</span>
          </div>
        </div>

        <div className={styles.row}>
          {telegramId ? (
            <button type="button" className={`${styles.btn} ${styles.btnDanger}`} disabled={busy} onClick={unlink}>
              Unlink Telegram
            </button>
          ) : (
            <button type="button" className={styles.btn} disabled={busy || !botName} onClick={generate}>
              {busy ? "Generating…" : "Generate Link"}
            </button>
          )}
        </div>

        {link && (
          <div className={styles.subItem}>
            <strong>Open this link in a private chat with the bot.</strong>
            <span className={styles.hint}>Valid for 10 minutes and works once. Do not post it in a group chat.</span>
            <code style={{ display: "block", wordBreak: "break-all", fontSize: 13, lineHeight: 1.5 }}>{link}</code>
            <div className={styles.row}>
              <a className={styles.btn} href={link} target="_blank" rel="noopener noreferrer">
                Open in Telegram
              </a>
              <button type="button" className={styles.pill} onClick={copy}>
                {copied ? "Copied" : "Copy Link"}
              </button>
              <button type="button" className={styles.lnk} onClick={() => setLink(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </section>
      {node}
    </div>
  );
}
