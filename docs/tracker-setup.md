# DAP timeline tracker: bot setup

The Telegram bot is the front end for **project groups** (the tracker's teams, `project_groups`; not the
co-learning groups that teach sessions): members log tasks, blockers and meetings in their group chat; DAP exco
(and exco admins) also set milestones and mark them done.

Code, all on grammY:

| File | What it does |
|---|---|
| `app/lib/cms/tracker.ts` | Rules and permissions (`can.tracker` = DAP exco and exco admins). The only place that writes tracker data. |
| `app/lib/cms/bot.ts` | The tracker's grammY `Composer`: the `COMMANDS` table, replies, buttons, reminders, the "/" menus |
| `app/lib/cms/bot-text.ts` | Parsing (commands, dates) and the rich message views. Pure |
| `app/lib/cms/telegram.ts` | Plumbing: the shared `Api` client, `getBotUsername()` (getMe), errors. Imports no feature |
| `app/lib/cms/telegram-bot.ts` | The site's one `Bot`: error boundary, once-per-update check, then the tracker handlers |
| `app/lib/cms/telegram-updates.ts` | `telegram_updates`: each `update_id` is handled once |
| `app/lib/cms/telegram-link.ts` | One-time links: link an admin's account, connect a project group's chat |
| `app/lib/cms/telegram-polling.ts` + `instrumentation.ts` | Long polling in local development |
| `app/api/telegram/webhook/route.ts` | The webhook (`webhookCallback`) |
| `app/lib/cms/jobs.ts` + `app/api/cron/daily/route.ts` | The daily jobs |

## Environment

| Variable | Purpose |
|---|---|
| `TELEGRAM_BOT_TOKEN` | The club bot (also posts the newsletter). Its @username comes from getMe; there is no username variable. |
| `TELEGRAM_WEBHOOK_SECRET` | Random string (A-Z a-z 0-9 _ -, up to 256 chars). The webhook rejects requests without it. Required on Vercel. Secrets stay environment variables. |
| `CRON_SECRET` | Authenticates the daily cron (`/api/cron/daily`). |
| `TELEGRAM_DAP_CHANNEL_ID` | Deprecated. Read only until the DAP channel is saved in Settings › Telegram; then remove it. |

The DAP channel for newsletter posts is a CMS setting (Settings › Telegram, exco admins).

## Set the webhook

**Settings › Telegram** (exco admins) has the webhook panel: Check, Set, Delete. Set deletes any existing webhook
first (a stale one can otherwise stay stuck), then sets it with the current `TELEGRAM_WEBHOOK_SECRET`,
`max_connections=1`, the update types the bot reads, and the target `NEXT_PUBLIC_SITE_URL` + `/api/telegram/webhook`.
It also refreshes the "/" command menus. **To change the key:** update
`TELEGRAM_WEBHOOK_SECRET`, redeploy, then select Set Webhook. The token and key are never shown in the browser.

The same by hand:

```sh
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://www.smubia.com/api/telegram/webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>" \
  -d "max_connections=1" \
  -d 'allowed_updates=["message","callback_query"]'
```

After a good secret the webhook always answers 200: errors are logged and answered in the chat, so Telegram never
re-sends. Re-sent updates are caught anyway by `telegram_updates` (each `update_id` once, in any order; the daily cron
forgets IDs after two days). Leave the bot's **privacy mode on** (BotFather default): the bot then sees only
`/commands`, replies to it and button presses, never the group's other messages.

## Go-live steps

1. Deploy (migrations `0013` and `0014` run in `vercel-build`).
2. Save the DAP channel in **Settings › Telegram**, then remove `TELEGRAM_DAP_CHANNEL_ID`. Select **Set Webhook**.
3. **Link each admin.** Settings › Telegram › Your Account makes a one-time link (random code, stored hashed,
   10 minutes, works once). Opening it in a *private* chat with the bot links that Telegram account at once. The
   bot checks only the numeric user ID; the name and @username are kept to show "Linked as …". Posted in a group,
   the link stops working. A superadmin with no People row gets one created.
4. Create the project groups on the DAP run's **Project Groups** page (number, name, mentors, members).
5. **Connect each project group's chat.** On the project group's page, **Connect Telegram Chat** makes a one-time
   `t.me/<bot>?startgroup=<code>` link. Telegram asks which group to add the bot to and sends `/start <code>` there
   (also when the bot is already in it), which connects that chat to exactly this project group, in any cohort,
   live or not. From then on **everyone in the chat has member rights for that project group**, so keep the chat
   membership tight. A new link connects a different chat; a chat connected to another project group moves over.

If Telegram upgrades a group to a supergroup its chat ID changes; the bot follows the migration message on its own.

## Commands

`/help` lists them in a table (tap a command to send it); admin commands and the `g3` tip show only in a private
chat. The "/" menu shows member commands in group chats and all commands in private chats.

- **Everyone in a connected chat:** `/milestones`, `/task <milestone#> title [by 20 Nov]`, `/edittask`,
  `/taskstatus <task#> todo|doing|done`, `/taskdone`, `/assign <task#> name|me|none`, `/deltask`,
  `/blocker <milestone#> text`, `/editblocker`, `/resolve`, `/reopenblocker`, `/delblocker`, `/meeting [date]`.
- **DAP exco:** `/milestone [g3] title [from 1 Dec] by 15 Dec`, `/editmilestone`, `/done`, `/status`,
  `/delmilestone`, `/reminders [g3] on|off`, and `/groups` in a private chat.

Inside a group chat everything is scoped to that chat's project group, admins included: what the bot posts there,
the whole group sees. In a private chat an admin reaches any project group of the current cohort (the live one,
else the newest) with `g3`.

Milestones, tasks and blockers are numbered within each project group: M1, M2, … for milestones, T1, T2, … for
tasks and B1, B2, … for blockers, as the bot, the dashboard and the MCP tools show them. Commands take the number
(`/taskdone 3` or `/taskdone T3`). A number is never given out again after a delete. Because the numbers repeat
across groups, an admin in a private chat names the group too: `/done g3 2`.

`/assign` takes a name: an exact or unique whole-word match on the member list assigns that member ("mia" finds
Mia Lim, "jay" does not find Jayden); a name that
matches nobody is kept as typed (shown as not on the member list); one that matches several members is refused.

Lists (`/milestones`, a milestone's tasks and blockers, `/groups`, the reminder) are Telegram rich messages with
tables. Each milestone's number in `/milestones` is a button that opens its tasks and blockers. In a private chat,
admin views also have an **Open in CMS** button (never in a group chat, where members would see it; not on
localhost, which Telegram refuses). Delete and Cancel only work for the person who asked.

## Dashboard

DAP exco and exco admins only (`can.tracker`); AI Lodge roles and lodge heads get a 404.

- **Project Groups** (`/admin/dap/<cohort>/project-groups`): totals, a swimlane timeline (one lane per project group,
  bars from start to due date, diamonds for milestones without a start date, overdue and open-blocker flags) and the
  table. `app/lib/cms/tracker-view.ts` computes the chart geometry; the page only draws it.
- **A project group** (`/project-groups/<id>`): details, chat (connect or disconnect), last meeting (log or correct),
  reminders switch, members, and milestones with their tasks and blockers.
- **Settings › Telegram** (`/admin/telegram`): Your Account (link, see which account is linked, unlink); for exco
  admins also the DAP channel, the webhook panel and every linked account with Unlink.

## Meeting reminders

A project group's last meeting date is the only meeting data kept. Three weeks after it, the daily cron (01:00 UTC,
±1 h on Hobby) posts a reminder in the group's chat, once per cycle, asking them to meet their mentors within the
next week. Logging `/meeting` starts a new cycle. Admins turn it off per group with `/reminders 3 off`. A group with no
meeting logged yet counts from the day it was added. Groups of archived cohorts are skipped.

## Daily cron

`/api/cron/daily` runs `app/lib/cms/jobs.ts` one job at a time: publish due newsletter issues, meeting reminders,
forget old update IDs, delete expired link codes. One failing never stops the others; the answer lists each
result and is 500 when any failed.

## Local development

`npm run dev` uses the embedded database (unset `DATABASE_URL`, e.g. `DATABASE_URL=` in `.env.development.local`).
With `TELEGRAM_BOT_TOKEN` set, the dev server **long-polls** Telegram itself, so the bot works on localhost without a
tunnel; the webhook panel shows "Polling (local)". It never deletes a webhook: if the bot has one (a deployed site
uses it), polling stays off and the server logs why. Use a separate dev bot then. If Telegram can't be reached at
startup, it tries again every 30 seconds. Run reminders by opening
`http://localhost:3000/api/cron/daily`. Without a token, replies are only logged.

`npm test` runs the service, link, bot and MCP tests on throwaway databases; none of them call Telegram.
