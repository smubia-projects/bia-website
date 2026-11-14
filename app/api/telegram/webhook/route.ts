import { timingSafeEqual } from "node:crypto";
import { claimUpdate, handleUpdate, type TgUpdate } from "@/app/lib/cms/bot";

/*
 * Telegram bot webhook for the DAP timeline tracker. Set it by hand (see
 * docs/tracker-setup.md) with the same secret as TELEGRAM_WEBHOOK_SECRET.
 * Always answers 200 once the secret checks out, so Telegram does not re-send
 * updates this code has already tried to handle.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function secretOk(header: string | null) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return !process.env.VERCEL; // unset is fine on localhost only
  const a = Buffer.from(header ?? "");
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!process.env.TELEGRAM_WEBHOOK_SECRET && process.env.VERCEL) {
    return Response.json({ error: "TELEGRAM_WEBHOOK_SECRET is not set" }, { status: 500 });
  }
  if (!secretOk(request.headers.get("x-telegram-bot-api-secret-token"))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const update = (await request.json().catch(() => null)) as TgUpdate | null;
  if (!update || !Number.isSafeInteger(update.update_id)) return Response.json({ ok: true });
  if (await claimUpdate(update.update_id)) await handleUpdate(update);
  return Response.json({ ok: true });
}
