/*
 * Runs once when a Next.js server process starts. In local development it starts long polling
 * for the Telegram bot (src/server/integrations/telegram/polling.ts), so the bot works without a public
 * webhook URL. Deployed sites use the webhook and never poll.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "development") return;
  const { startDevPolling } = await import("./server/integrations/telegram/polling");
  await startDevPolling().catch((error) => console.error("[telegram] Could not start polling", error));
}
