import { notFound } from "next/navigation";
import { can } from "@/app/lib/cms/actor";
import { requireActorPage } from "@/app/lib/cms/session";
import { linkedTelegramId } from "@/app/lib/cms/telegram-link";
import TelegramLink from "./TelegramLink";

export default async function TelegramPage() {
  const actor = await requireActorPage();
  if (!can.tracker(actor)) notFound();
  return <TelegramLink telegramId={await linkedTelegramId(actor.email)} botName={process.env.TELEGRAM_BOT_USERNAME ?? ""} />;
}
