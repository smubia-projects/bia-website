import { notFound } from "next/navigation";
import { can } from "@/app/lib/cms/actor";
import { requireActorPage } from "@/app/lib/cms/session";
import { getBotUsername } from "@/app/lib/cms/telegram";
import { linkedTelegram } from "@/app/lib/cms/telegram-link";
import { dapChannelView, listLinkedAccounts } from "@/app/lib/cms/telegram-settings";
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
      {bot && <BotSettings channelId={bot.channel.channelId} channelFromEnv={bot.channel.fromEnv} accounts={bot.accounts} />}
    </TelegramLink>
  );
}
