# DAP timeline tracker: bot setup

The Telegram bot is the front end for project groups: members log tasks, blockers and meetings in their
group chat; DAP exco (and exco admins) also set milestones and mark them done. Code: `app/lib/cms/tracker.ts`
(rules), `bot.ts` (commands), `app/api/telegram/webhook/route.ts` (entry). No Redis is used.

## Environment

| Variable | Purpose |
|---|---|
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` | Already used by the newsletter bot. Same bot. |
| `TELEGRAM_WEBHOOK_SECRET` | New. Random string (A-Z a-z 0-9 _ -, up to 256 chars). The webhook rejects requests without it. Required on Vercel. |
| `AUTH_SECRET` | Existing. Also signs the one-time admin link. |
| `CRON_SECRET` | Existing. The daily cron also sends the 3-week meeting reminders. |

## Register the webhook (manual)

```sh
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://www.smubia.com/api/telegram/webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>" \
  -d "max_connections=1" \
  -d 'allowed_updates=["message","callback_query"]'
```

The Timeline Tracker page has the same thing as buttons (**Telegram Webhook**: Check, Set, Delete). Set deletes any existing webhook first (a stale one can otherwise stay stuck), then registers it with the current
`TELEGRAM_WEBHOOK_SECRET`, `max_connections=1` and the target `NEXT_PUBLIC_SITE_URL` + `/api/telegram/webhook`. **To change the key:**
update `TELEGRAM_WEBHOOK_SECRET` in the environment, redeploy, then select Set Webhook (the old key stops working at once,
and the page shows the last error if Telegram still posts with it). The token and key are never shown in the browser.

`max_connections=1` makes Telegram deliver one update at a time, in order. The duplicate check keeps only the
last handled `update_id`, so it relies on that. Leave the bot's **privacy mode on** (BotFather default): the bot
then sees only `/commands`, replies to it and button presses, never the group's other messages.

## Go-live steps

1. Deploy (the migration `0013` runs in `vercel-build`).
2. **Link each admin.** Settings › Telegram generates a 10-minute link; opening it in a *private* chat with the bot
   stores that person's Telegram user ID (not the username). One link, one account: it does nothing once the
   account is linked. A superadmin with no People row gets one created.
3. Create the project groups on the dashboard (group number, name, mentors).
4. Add the bot to each group chat. A DAP exco sends **`/register <group#>`** in it. From then on the bot listens
   in that chat only, and **everyone in the chat has member rights for that group**, so keep the chat membership tight.
5. Commands: `/help` in the chat lists them. Admins can also use a private chat with the bot to reach any group
   (`/groups`, `/milestones 3`, `g3` prefixes).

If Telegram upgrades a group to a supergroup its chat ID changes; the bot follows the migration message on its own.
If a chat ever needs re-registering, run `/register <group#>` again.

## Dashboard

DAP exco and exco admins only (`can.tracker`); AI Lodge roles and lodge heads get a 404.

- **Timeline Tracker** (`/admin/dap/<cohort>/tracker`): totals, a swimlane timeline (one lane per group, bars from start to
  due date, diamonds for milestones without a start date, overdue and open-blocker flags) and the groups table.
  `app/lib/cms/tracker-view.ts` computes the chart geometry; the page only draws it.
- **Group page** (`/tracker/<group id>`): group details, chat status (unregister), last meeting (log or correct),
  reminders switch, roster, and milestones with their tasks and blockers.
- **Settings › Telegram** (`/admin/telegram`): generate the one-time link, or unlink.

## Meeting reminders

A group's last meeting date is the only meeting data kept. Three weeks after it, the daily cron (01:00 UTC, ±1 h on
Hobby) posts a reminder in the group's chat, once per cycle, asking them to meet their mentors within the next
week. Logging `/meeting` starts a new cycle. Admins turn it off per group with `/reminders 3 off`.
A group with no meeting logged yet counts from the day it was added. Groups of archived cohorts are skipped.

## Local development

`npm run dev` uses the embedded database. Point a tunnel (e.g. `cloudflared tunnel --url http://localhost:3000`)
at it and run `setWebhook` against the tunnel URL; without `TELEGRAM_BOT_TOKEN` replies are only logged.
`npm test` runs the service, link and bot tests on a throwaway database; none of them call Telegram.
