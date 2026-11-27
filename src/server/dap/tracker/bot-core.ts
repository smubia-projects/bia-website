import "server-only";
import type { InlineKeyboardButton } from "grammy/types";
import { ensure, type Actor } from "@/server/core/actor";
import * as tracker from "./service";
import type { ProjectGroup, TrackerWho } from "./service";

/** What the bot's commands and button flows share: who is asking, what a reply looks like, which group a command is about. */

export interface Ctx {
  chatId: number;
  /** The sender's Telegram user ID */
  fromId: number;
  isPrivate: boolean;
  name: string;
  who: TrackerWho;
  actor: Actor | null;
  group: ProjectGroup | null;
  /** What data commands run as: in a group chat, always that chat's group (never wider, even for admins) */
  scope: TrackerWho;
  today: string;
}

export interface Reply {
  text: string;
  /** A rich message (tables, headings): for views that list several things */
  rich?: boolean;
  markup?: { inline_keyboard: InlineKeyboardButton[][] };
  /** Asks for a typed answer: Telegram opens the reply box for the asker. The text is the box's hint. */
  forceReply?: string;
}

export const requireActor = (c: Ctx): Actor => {
  ensure(c.actor, "Only DAP exco can do that.");
  return c.actor;
};

/** The group a command is about: this chat's, or an admin's explicit one from a private chat. */
export async function groupFor(c: Ctx, explicit?: number): Promise<ProjectGroup> {
  if (explicit !== undefined && c.actor) {
    ensure(c.isPrivate || explicit === c.group?.number, `This chat is Group ${c.group?.number}. Message me privately to work on another group.`);
    return c.group?.number === explicit ? c.group : tracker.groupByNumber(c.actor, explicit);
  }
  ensure(c.group, "Add the project group's number, e.g. /milestones g3");
  return c.group;
}
