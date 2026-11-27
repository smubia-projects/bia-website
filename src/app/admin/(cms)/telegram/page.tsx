import { notFound } from "next/navigation";
import { can } from "@/server/core/permissions";
import { requireActorPage } from "@/server/auth/session";
import { getBotUsername } from "@/server/integrations/telegram/client";
import { linkedTelegram } from "@/server/people/telegram-link";
import { dapChannelView, listLinkedAccounts } from "@/server/core/settings";
import { expectedWebhookUrl } from "@/server/integrations/telegram/webhook";
import { isPolling } from "@/server/integrations/telegram/polling";
import WebhookPanel from "../_run/WebhookPanel";
import BotSettings from "./BotSettings";
import TelegramLink from "./TelegramLink";

/** Settings › Telegram: Your Account for everyone with tracker access; the Bot sections for exco admins. */
export default async function TelegramPage() {
  const actor = await requireActorPage();
  if (!can.tracker(actor)) notFound();
  const [account, botName] = await Promise.all([linkedTelegram(actor.email), getBotUsername().catch(() => "")]);
  const bot = can.manageTelegramBot(actor) ? { channel: await dapChannelView(actor), accounts: await listLinkedAccounts(actor) } : null;
  return (
    <TelegramLink account={account} botName={botName}>
      {bot && (
        <BotSettings channelId={bot.channel.channelId} channelFromEnv={bot.channel.fromEnv} accounts={bot.accounts}>
          <WebhookPanel
            expectedUrl={expectedWebhookUrl()}
            tokenConfigured={Boolean(process.env.TELEGRAM_BOT_TOKEN)}
            secretConfigured={Boolean(process.env.TELEGRAM_WEBHOOK_SECRET)}
            polling={isPolling()}
          />
        </BotSettings>
      )}
    </TelegramLink>
  );
}
