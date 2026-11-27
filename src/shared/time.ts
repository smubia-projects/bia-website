/*
 * Singapore dates, shared by the server and the browser. The club runs on Singapore time
 * (UTC+8, no daylight saving), so a "day" everywhere in the CMS and the bot is an SGT day.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Today in Singapore, as YYYY-MM-DD. */
export function todaySgt() {
  return new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
}

/** A timestamp as a Singapore calendar date. */
export const sgtDay = (when: string | Date) => new Date(new Date(when).getTime() + 8 * 3_600_000).toISOString().slice(0, 10);

/** A calendar day as a moment: noon Singapore time, so date-only meeting logs land on that day everywhere. */
export const noonSgt = (iso: string) => new Date(`${iso}T12:00:00+08:00`);

/** "20 Nov", with the year when it is not the current one. */
export function shortDate(iso: string, today: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}${String(y) !== today.slice(0, 4) ? ` ${y}` : ""}`;
}
