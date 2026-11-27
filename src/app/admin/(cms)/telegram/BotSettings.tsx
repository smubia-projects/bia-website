"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LinkedAccount } from "@/server/core/settings";
import { setDapChannelAction, unlinkTelegramAction } from "../../actions";
import { UnsavedNote, useActionToast, useConfirm } from "../../_components/ui";
import styles from "../../cms.module.css";
import t from "../../tracker.module.css";

/** Settings › Telegram › Bot (exco admins): the DAP channel and every linked Telegram account. */
export default function BotSettings({ channelId, channelFromEnv, accounts, children }: {
  channelId: string;
  channelFromEnv: boolean;
  accounts: LinkedAccount[];
  /** The webhook panel, rendered by the page */
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const { handle, node } = useActionToast();
  const confirm = useConfirm();
  const [channel, setChannel] = useState(channelId);
  const [busy, setBusy] = useState(false);
  const dirty = channel.trim() !== channelId || (channelFromEnv && channel.trim() !== "");

  async function save() {
    setBusy(true);
    const ok = handle(await setDapChannelAction(channel), "DAP channel saved") !== undefined;
    setBusy(false);
    if (ok) router.refresh();
  }

  async function unlink(a: LinkedAccount) {
    const who = a.name || a.email;
    if (!(await confirm({ title: "Unlink Telegram", body: `The bot stops treating ${who}'s Telegram account as DAP exco until they link it again.`, action: "Unlink Telegram", danger: true }))) return;
    setBusy(true);
    const ok = handle(await unlinkTelegramAction(a.email)) !== undefined;
    setBusy(false);
    if (ok) router.refresh();
  }

  return (
    <>
      <div className={t.groupHead}>
        <h2 className={t.groupTitle}>Bot Settings</h2>
        <p className={styles.sectionHint}>For the whole bot. Exco admins only.</p>
      </div>

      <section className={styles.panel}>
        <h2 className={styles.h2}>DAP Channel</h2>
        <label className={styles.fld}>
          Channel
          <input className={styles.inp} value={channel} placeholder="@smubia_dap or -1001234567890" onChange={(e) => setChannel(e.target.value)} />
          <span className={styles.hint}>Newsletter issues are posted here when published. The bot must be an admin of the channel.</span>
          {channelFromEnv && <span className={styles.hint}>Currently read from TELEGRAM_DAP_CHANNEL_ID. Save it here to stop using the variable.</span>}
        </label>
        <div className={styles.row}>
          <button type="button" className={styles.btn} disabled={busy || !dirty} onClick={save}>
            Save Channel
          </button>
          <UnsavedNote show={dirty && !channelFromEnv} onDiscard={() => setChannel(channelId)} />
        </div>
      </section>

      {children}

      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <h2 className={styles.h2}>Linked Accounts</h2>
          <p className={styles.sectionHint}>Accounts the bot treats as DAP exco. Each person links their own under Your Account.</p>
        </div>
        {accounts.length === 0 ? (
          <p className={styles.emptyInline}>No linked accounts.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table} style={{ minWidth: 520 }}>
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Telegram Account</th>
                  <th>
                    <span className={t.srOnly}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.email}>
                    <td>
                      <span className={styles.cellTitle}>{a.name || a.email}</span>
                      <div className={styles.hint}>{a.email}</div>
                    </td>
                    <td>
                      {a.telegramName || "Name not recorded"}
                      {a.telegramUsername && <div className={styles.hint}>@{a.telegramUsername}</div>}
                    </td>
                    <td className={styles.actionsCell}>
                      <button type="button" className={`${styles.lnk} ${styles.lnkDanger}`} disabled={busy} onClick={() => unlink(a)}>
                        Unlink
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {node}
    </>
  );
}
