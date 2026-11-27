import { handleTimeline } from "@/server/dap/tracker/mini-app";
import { telegramApi } from "@/server/integrations/telegram/client";

/* One project group's milestones and tasks for the Mini App, only for someone who may open that group (src/server/dap/tracker/mini-app.ts). */
export const dynamic = "force-dynamic";

export const GET = (request: Request) => handleTimeline(request, telegramApi());
