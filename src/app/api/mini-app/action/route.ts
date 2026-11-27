import { handleAction } from "@/server/dap/tracker/mini-app";
import { telegramApi } from "@/server/integrations/telegram/client";

/* A change from the Mini App (add a task, log a meeting…), only from someone who may open that project group (mini-app.ts). */
export const dynamic = "force-dynamic";

export const POST = (request: Request) => handleAction(request, telegramApi());
