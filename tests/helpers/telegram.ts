import { telegramApi } from "@/server/integrations/telegram/client";

export interface TelegramCall {
  method: string;
  body: Record<string, unknown>;
}

/**
 * A fake Telegram on the shared grammY client: a transformer that records every API call and
 * answers it from `respond` (default: `true`). getMe answers with a test bot. Set
 * TELEGRAM_BOT_TOKEN before calling this; the client is rebuilt when the token changes.
 */
export function fakeTelegram(respond: (call: TelegramCall) => unknown = () => true) {
  const calls: TelegramCall[] = [];
  const fake = {
    calls,
    respond,
    clear: () => calls.splice(0),
    of: (method: string) => calls.filter((c) => c.method === method),
  };
  telegramApi().config.use(async (_prev, method, payload) => {
    if (method === "getMe") return { ok: true, result: { id: 123, is_bot: true, first_name: "Test", username: "TestBot" } as never };
    const call = { method, body: (payload ?? {}) as Record<string, unknown> };
    calls.push(call);
    const result = fake.respond(call);
    if (result instanceof Error) return { ok: false, error_code: 400, description: result.message } as never;
    return { ok: true, result: result as never };
  });
  return fake;
}
