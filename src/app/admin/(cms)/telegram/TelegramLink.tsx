"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { createTelegramLinkAction, unlinkTelegramAction } from "../../actions";
import { PageHead, useActionToast, useConfirm } from "../../_components/ui";
import styles from "../../cms.module.css";
import t from "../../tracker.module.css";
import type { TelegramAccount } from "@/server/people/telegram-link";

/**
 * Links the signed-in admin's Telegram account, so the tracker bot recognises them in group chats.
 * Only the numeric Telegram user ID is stored, never the username.
 */
export default function TelegramLink({ account, botName, children }: { account: TelegramAccount | null; botName: string; children?: React.ReactNode }) {
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
      <PageHead title="Telegram" sub="Account linking for the DAP timeline tracker bot. A linked account has DAP exco rights in every connected project group chat." />

      <section className={styles.panel}>
        <h2 className={styles.h2}>Your Account</h2>
        <div className={`${t.fact} ${t.factSolo}`}>
          <span className={`${t.state} ${account ? t.stateOk : t.stateMuted}`}>{account ? "Linked" : "Not linked"}</span>
          {account && (
            <span className={t.factValue}>
              {account.name}
              {account.username ? ` (@${account.username})` : ""}
            </span>
          )}
          <dl className={t.kv}>
            <dt>Bot</dt>
            <dd>{botName ? `@${botName}` : "Not configured"}</dd>
          </dl>
          <div className={t.factActions}>
            {account ? (
              <button type="button" className={`${styles.lnk} ${styles.lnkDanger}`} disabled={busy} onClick={unlink}>
                Unlink Telegram
              </button>
            ) : (
              <button type="button" className={t.tgBtn} disabled={busy || !botName} onClick={generate}>
                <Send size={16} strokeWidth={2} aria-hidden="true" />
                {busy ? "Creating Link…" : "Link Telegram Account"}
              </button>
            )}
          </div>
        </div>

        {link && (
          <div className={styles.subItem}>
            <strong>Open the link to finish linking</strong>
            <span className={styles.hint}>It opens a private chat with @{botName}. The link works once, for 10 minutes. Never post it in a group chat.</span>
            <code style={{ display: "block", wordBreak: "break-all", fontSize: 13, lineHeight: 1.5 }}>{link}</code>
            <div className={styles.row}>
              <a className={t.tgBtn} href={link} target="_blank" rel="noopener noreferrer">
                <Send size={16} strokeWidth={2} aria-hidden="true" />
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
      {children}
      {node}
    </div>
  );
}
