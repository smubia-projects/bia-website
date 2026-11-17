"use client";

import { useCallback, useEffect, useState } from "react";
import Script from "next/script";
import { CircleAlert, CircleCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { call, failed, type Loaded, type Session, type Timeline } from "./api";
import type { Act } from "./forms";
import GroupView from "./GroupView";
import styles from "./mini-app.module.css";

interface TelegramWebApp {
  initData: string;
  colorScheme: "light" | "dark";
  ready(): void;
  expand(): void;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
  onEvent?(event: "themeChanged", handler: () => void): void;
  offEvent?(event: "themeChanged", handler: () => void): void;
  HapticFeedback?: { notificationOccurred(kind: "success" | "error"): void };
}
declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

/** The page colour of each scheme, so Telegram's own header and overscroll match. */
const PAGE = { light: "#f6faf8", dark: "#0c211c" } as const;

function Skeleton() {
  return (
    <div className={styles.skeleton} role="status" aria-label="Loading project group">
      <div className={styles.tiles}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={styles.skeletonBlock} />
        ))}
      </div>
      <span className={`${styles.skeletonBlock} ${styles.skeletonCard}`} />
      <span className={`${styles.skeletonBlock} ${styles.skeletonCard}`} />
    </div>
  );
}

function Notice({ title, children, retry }: { title: string; children: React.ReactNode; retry?: () => void }) {
  return (
    <section className={styles.notice} role="alert">
      <CircleAlert size={22} strokeWidth={1.75} aria-hidden />
      <div>
        <h2 className={styles.rowTitle}>{title}</h2>
        <p className={styles.caption}>{children}</p>
        {retry && (
          <button type="button" className={styles.buttonSmall} onClick={retry}>
            <RefreshCw size={16} strokeWidth={1.75} aria-hidden />
            Retry
          </button>
        )}
      </div>
    </section>
  );
}

export default function MiniApp() {
  // null until Telegram's script has loaded; "" when the page is open outside Telegram.
  const [initData, setInitData] = useState<string | null>(null);
  const [scheme, setScheme] = useState<"light" | "dark">("light");
  const [attempt, setAttempt] = useState(0);
  const [session, setSession] = useState<Loaded<Session> | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [timelines, setTimelines] = useState<Record<number, Loaded<Timeline>>>({});
  const [toast, setToast] = useState<{ text: string; id: number; error: boolean } | null>(null);

  const notify = useCallback((text: string, error = false) => setToast({ text, id: Date.now(), error }), []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!initData) return;
    let live = true;
    call<Session>("/api/mini-app/session", initData).then((s) => live && setSession(s));
    return () => {
      live = false;
    };
  }, [initData, attempt]);

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

  const act: Act = async (action, fields) => {
    const result = await call<{ message: string; timeline: Timeline }>("/api/mini-app/action", initData ?? "", { group: current, action, ...fields });
    if (failed(result)) {
      window.Telegram?.WebApp.HapticFeedback?.notificationOccurred("error");
      return result.error;
    }
    setTimelines((all) => ({ ...all, [current as number]: result.timeline }));
    notify(result.message);
    window.Telegram?.WebApp.HapticFeedback?.notificationOccurred("success");
    return null;
  };

  const retry = () => {
    setSession(null);
    setTimelines({});
    setAttempt((n) => n + 1);
  };

  return (
    <main className={styles.app} data-scheme={scheme}>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onReady={() => {
          const app = window.Telegram?.WebApp;
          app?.ready();
          app?.expand();
          const apply = () => {
            if (!app) return;
            setScheme(app.colorScheme === "dark" ? "dark" : "light");
            app.setHeaderColor?.(PAGE[app.colorScheme === "dark" ? "dark" : "light"]);
            app.setBackgroundColor?.(PAGE[app.colorScheme === "dark" ? "dark" : "light"]);
          };
          apply();
          app?.onEvent?.("themeChanged", apply);
          setInitData(app?.initData ?? "");
        }}
      />

      <header className={styles.head}>
        <p className={styles.eyebrow}>DAP Project Tracker</p>
        <h1 className={styles.h1}>
          {timeline && !failed(timeline) ? `Group ${timeline.group.number}` : "Project Group"}
          {timeline && !failed(timeline) && timeline.group.name && <span className={styles.groupName}>{timeline.group.name}</span>}
        </h1>
        {ok && (
          <p className={styles.identity}>
            <span>{ok.user.name}</span>
            <span className={styles.badge}>{ok.admin ? "DAP Exco" : "Member"}</span>
          </p>
        )}
      </header>

      {initData === "" && <Notice title="Telegram session not found">Open this page from the Tracker button the bot sends with /start.</Notice>}
      {failed(session) && (
        <Notice title="Sign-in could not be completed" retry={retry}>
          {session.error}
        </Notice>
      )}

      {initData && session === null && <Skeleton />}

      {ok && ok.groups.length === 0 && (
        <Notice title="No project group found">This account is not in a connected project group chat. Open the app from the group chat, or ask a DAP exco to connect the chat.</Notice>
      )}

      {ok && ok.groups.length > 1 && (
        <nav className={styles.tabs} aria-label="Project groups">
          {ok.groups.map((g) => (
            <button key={g.number} type="button" className={styles.tab} aria-current={g.number === current ? "true" : undefined} onClick={() => setPicked(g.number)}>
              Group {g.number}
            </button>
          ))}
        </nav>
      )}

      {ok && ok.groups.length > 0 && !timeline && <Skeleton />}
      {failed(timeline) && (
        <Notice
          title="Project group unavailable"
          retry={() => setTimelines((all) => Object.fromEntries(Object.entries(all).filter(([n]) => Number(n) !== current)))}
        >
          {timeline.error}
        </Notice>
      )}
      {timeline && !failed(timeline) && <GroupView key={current} timeline={timeline} act={act} notify={notify} />}

      {ok?.checks && (
        <details className={styles.diagnostics}>
          <summary>
            <ShieldCheck size={18} strokeWidth={1.75} aria-hidden />
            Membership Check
          </summary>
          <p className={styles.caption}>Telegram&apos;s answer (getChatMember) for each connected chat. Shown to DAP exco only.</p>
          {ok.checks.length === 0 ? (
            <p className={styles.none}>No connected chats</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Group</th>
                  <th scope="col">Chat ID</th>
                  <th scope="col">Answer</th>
                </tr>
              </thead>
              <tbody>
                {ok.checks.map((c) => (
                  <tr key={c.group}>
                    <td>{c.group}</td>
                    <td className={styles.mono}>{c.chatId}</td>
                    <td className={c.status ? undefined : styles.metaAlert}>{c.status ?? c.error ?? "No answer"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className={styles.caption}>
            Opened from: {ok.chatType || "direct launch"}. Link names: {ok.startParam || "none"}.
          </p>
        </details>
      )}

      {toast && (
        <div className={`${styles.toast} ${toast.error ? styles.toastError : ""}`} role={toast.error ? "alert" : "status"} key={toast.id}>
          {toast.error ? <CircleAlert size={18} strokeWidth={1.75} aria-hidden /> : <CircleCheck size={18} strokeWidth={1.75} aria-hidden />}
          {toast.text}
        </div>
      )}
    </main>
  );
}
