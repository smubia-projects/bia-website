import { handleTimeline } from "@/app/lib/cms/mini-app";
import { telegramApi } from "@/app/lib/cms/telegram";

/* One project group's milestones and tasks for the Mini App, only for someone who may open that group (mini-app.ts). */
export const dynamic = "force-dynamic";

export const GET = (request: Request) => handleTimeline(request, telegramApi());
