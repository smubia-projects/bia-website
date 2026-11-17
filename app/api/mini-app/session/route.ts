import { handleSession } from "@/app/lib/cms/mini-app";
import { telegramApi } from "@/app/lib/cms/telegram";

/* The tracker Mini App's first call: who opened it and which project groups they may open (mini-app.ts). */
export const dynamic = "force-dynamic";

export const GET = (request: Request) => handleSession(request, telegramApi());
