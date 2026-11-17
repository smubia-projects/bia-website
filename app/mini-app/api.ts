/** What the Mini App's endpoints return, and how it calls them. Every call carries Telegram's signed launch data. */

export type Status = "todo" | "in_progress" | "done";
export type BlockerStatus = "open" | "resolved";

export interface Task {
  number: number;
  title: string;
  status: Status;
  dueOn: string | null;
  assigneeId: number | null;
  assignee: string;
}
export interface Blocker {
  number: number;
  description: string;
  status: BlockerStatus;
}
export interface Milestone {
  number: number;
  title: string;
  notes: string;
  status: Status;
  startsOn: string | null;
  dueOn: string;
  tasks: Task[];
  blockers: Blocker[];
}
export interface Timeline {
  group: { number: number; name: string };
  can: { manage: boolean };
  meeting: { lastOn: string | null; dueBy: string; reminders: boolean };
  members: { id: number; name: string }[];
  milestones: Milestone[];
}
export interface Session {
  user: { id: number; name: string };
  admin: boolean;
  chatType: string;
  startParam: string;
  groups: { number: number; name: string; how: "admin" | "member" }[];
  checks?: { group: number; chatId: number; status?: string; error?: string }[];
}

export type Failure = { error: string };
export type Loaded<T extends object> = T | Failure;
export const failed = <T extends object>(x: Loaded<T> | null | undefined): x is Failure => Boolean(x && "error" in x);

export async function call<T extends object>(path: string, initData: string, body?: object): Promise<Loaded<T>> {
  try {
    const res = await fetch(path, {
      method: body ? "POST" : "GET",
      headers: { authorization: `tma ${initData}`, ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const json = await res.json();
    return res.ok ? (json as T) : { error: String(json.error ?? "The request failed.") };
  } catch {
    return { error: "The server could not be reached. Check the connection and retry." };
  }
}

// ── Dates (the club works in Singapore time; the bot asks for DD/MM/YYYY) ──

export const todayIso = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
/** 2026-11-17 → 17/11/2026 */
export const day = (iso: string) => iso.split("-").reverse().join("/");
/** Whole days from one ISO date to another (negative when `to` is earlier). */
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
