import { handleSession } from "@/server/dap/tracker/mini-app";
import { telegramApi } from "@/server/integrations/telegram/client";

/* The tracker Mini App's first call: who opened it and which project groups they may open (src/server/dap/tracker/mini-app.ts). */
export const dynamic = "force-dynamic";

export const GET = (request: Request) => handleSession(request, telegramApi());
