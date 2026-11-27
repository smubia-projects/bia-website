"use server";

import { CmsError } from "@/server/core/actor";
import { createAccountLink, unlinkTelegram } from "@/server/people/telegram-link";
import * as webhook from "@/server/integrations/telegram/webhook";
import { syncBotCommands } from "@/server/dap/tracker/bot";
import { telegramError } from "@/server/integrations/telegram/client";
import { setDapChannelId } from "@/server/core/settings";
import { run, track } from "./run";

export async function getWebhookInfoAction() {
  return run((actor) => webhook.getWebhookInfo(actor));
}

export async function setWebhookAction() {
  return run(async (actor) => {
    await webhook.setWebhook(actor);
    // The "/" command menus come from the bot's command table; setting the webhook refreshes them.
    await syncBotCommands().catch((error) => {
      throw new CmsError(`The webhook is set, but the command menus were not updated (${telegramError(error).message}). Select Set Webhook to retry.`);
    });
    return webhook.getWebhookInfo(actor);
  }, "Webhook and command menus set");
}

export async function deleteWebhookAction() {
  return run(async (actor) => {
    await webhook.deleteWebhook(actor);
    return webhook.getWebhookInfo(actor);
  }, "Webhook deleted");
}

export async function createTelegramLinkAction() {
  return run((actor) => createAccountLink(actor));
}

/** Unlinks the signed-in person's Telegram account, or (exco admins) someone else's. */
export async function unlinkTelegramAction(email?: string) {
  return track((actor) => unlinkTelegram(actor, email).then(() => null), "Telegram unlinked");
}

export async function setDapChannelAction(channelId: string) {
  return track((actor) => setDapChannelId(actor, channelId).then(() => null), "DAP channel saved");
}
