"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import styles from "./mini-app.module.css";

interface TelegramWebApp {
  initData: string;
  ready(): void;
  expand(): void;
}
declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

interface Session {
  user: { id: number; name: string };
  admin: boolean;
  chatType: string;
  startParam: string;
  groups: { number: number; name: string; how: "admin" | "member" }[];
  checks?: { group: number; chatId: number; status?: string; error?: string }[];
}
interface Timeline {
  group: { number: number; name: string };
  milestones: {
    number: number;
    title: string;
    status: "todo" | "in_progress" | "done";
    startsOn: string | null;
    dueOn: string;
    openBlockers: number;
    tasks: { number: number; title: string; status: "todo" | "in_progress" | "done"; dueOn: string | null; assignee: string }[];
  }[];
}
type Loaded<T extends object> = T | { error: string };

const STATUS = { todo: "To do", in_progress: "In progress", done: "Done" } as const;
/** DD/MM/YYYY, the format the bot asks for. */
const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-SG", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const failed = <T extends object>(x: Loaded<T> | null | undefined): x is { error: string } => Boolean(x && "error" in x);

async function call<T extends object>(path: string, initData: string): Promise<Loaded<T>> {
  try {
    const res = await fetch(path, { headers: { authorization: `tma ${initData}` }, cache: "no-store" });
    const body = await res.json();
    return res.ok ? (body as T) : { error: String(body.error ?? "The request failed.") };
  } catch {
    return { error: "The server could not be reached." };
  }
}

export default function MiniApp() {
  // null until Telegram's script has loaded; "" when the page is open outside Telegram.
  const [initData, setInitData] = useState<string | null>(null);
  const [session, setSession] = useState<Loaded<Session> | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [timelines, setTimelines] = useState<Record<number, Loaded<Timeline>>>({});

  useEffect(() => {
    if (!initData) return;
    let live = true;
    call<Session>("/api/mini-app/session", initData).then((s) => live && setSession(s));
    return () => {
      live = false;
    };
  }, [initData]);

  const ok = session && !failed(session) ? session : null;
  // The project group the launch link named, else the first this person may open.
  const hinted = ok?.groups.find((g) => `g${g.number}` === ok.startParam)?.number;
  const current = picked ?? hinted ?? ok?.groups[0]?.number;

  useEffect(() => {
    if (!initData || current === undefined || timelines[current]) return;
    let live = true;
    call<Timeline>(`/api/mini-app/timeline?group=${current}`, initData).then((t) => live && setTimelines((all) => ({ ...all, [current]: t })));
    return () => {
      live = false;
    };
  }, [initData, current, timelines]);

  const timeline = current === undefined ? undefined : timelines[current];

  return (
    <main className={styles.app}>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onReady={() => {
          const app = window.Telegram?.WebApp;
          app?.ready();
          app?.expand();
          setInitData(app?.initData ?? "");
        }}
      />
      <header className={styles.head}>
        <h1 className={styles.h1}>Project Tracker</h1>
        {ok && (
          <p className={styles.hint}>
            {ok.user.name} <span className={styles.chip}>{ok.admin ? "DAP exco" : "Member"}</span>
          </p>
        )}
      </header>

      {initData === null && <p className={styles.hint}>Loading…</p>}
      {initData === "" && <p className={styles.note}>Telegram session not found. Open this page from the bot&apos;s /start button.</p>}
      {initData && session === null && <p className={styles.hint}>Verifying Telegram sign-in…</p>}
      {failed(session) && <p className={styles.note}>{session.error}</p>}

      {ok && ok.groups.length === 0 && (
        <p className={styles.note}>No project group found for this account. Open the app from your project group&apos;s chat, and ask a DAP exco to connect the chat if the bot does not answer there.</p>
      )}

      {ok && ok.groups.length > 1 && (
        <nav className={styles.tabs} aria-label="Project groups">
          {ok.groups.map((g) => (
            <button key={g.number} type="button" className={styles.tab} aria-pressed={g.number === current} onClick={() => setPicked(g.number)}>
              Group {g.number}
            </button>
          ))}
        </nav>
      )}

      {failed(timeline) && <p className={styles.note}>{timeline.error}</p>}
      {timeline && !failed(timeline) && (
        <section aria-label={`Group ${timeline.group.number}`}>
          <h2 className={styles.h2}>
            Group {timeline.group.number}
            {timeline.group.name ? ` · ${timeline.group.name}` : ""}
          </h2>
          {timeline.milestones.length === 0 && <p className={styles.hint}>No milestones.</p>}
          {timeline.milestones.map((m) => (
            <article key={m.number} className={styles.card}>
              <div className={styles.row}>
                <h3 className={styles.h3}>
                  M{m.number} {m.title}
                </h3>
                <span className={`${styles.chip} ${m.status === "done" ? styles.done : ""}`}>{STATUS[m.status]}</span>
              </div>
              <p className={styles.hint}>
                {m.startsOn ? `${day(m.startsOn)} to ` : "Due "}
                {day(m.dueOn)}
                {m.openBlockers > 0 ? ` · ${m.openBlockers} open blocker${m.openBlockers > 1 ? "s" : ""}` : ""}
              </p>
              <ul className={styles.tasks}>
                {m.tasks.map((t) => (
                  <li key={t.number}>
                    <span className={styles.hint}>T{t.number}</span> {t.title}
                    <span className={styles.hint}>
                      {" "}
                      · {STATUS[t.status]}
                      {t.dueOn ? ` · ${day(t.dueOn)}` : ""}
                      {t.assignee ? ` · ${t.assignee}` : ""}
                    </span>
                  </li>
                ))}
                {m.tasks.length === 0 && <li className={styles.hint}>No tasks.</li>}
              </ul>
            </article>
          ))}
        </section>
      )}

      {ok?.checks && (
        <section className={styles.card} aria-label="Membership check">
          <h2 className={styles.h2}>Membership Check</h2>
          <p className={styles.hint}>What Telegram answers when the bot asks whether you are in each connected chat (getChatMember). Shown to DAP exco only.</p>
          {ok.checks.length === 0 && <p className={styles.hint}>No connected chats.</p>}
          <ul className={styles.tasks}>
            {ok.checks.map((c) => (
              <li key={c.group}>
                Group {c.group} <span className={styles.hint}>(chat {c.chatId})</span>: {c.status ? <strong>{c.status}</strong> : <span className={styles.bad}>{c.error ?? "no answer"}</span>}
              </li>
            ))}
          </ul>
          <p className={styles.hint}>Opened from: {ok.chatType || "not a link launch"}{ok.startParam ? ` · link names ${ok.startParam}` : ""}</p>
        </section>
      )}
    </main>
  );
}
