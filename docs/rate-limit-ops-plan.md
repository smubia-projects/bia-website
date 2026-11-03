# Plan: rate-limit controls in /admin (replacing the Google Sheet)

Status: **planned, not started** (noted 2026-11-02). Build it after the CMS cutover has settled.

The deployed student projects (`../bia-all-projects`, AI Lodge on Cloud Run, DAP on HF Spaces) share
one rate limiter. Today its controls live in a Google Sheet with an Apps Script that writes config
keys into the shared Upstash Redis. The plan is to move those controls into an **Ops** page in
smubia.com `/admin`, behind the Google sign-in and roles, so who changed what is controlled and logged.

## What exists today

- Key schema, Sheet layout and Apps Script: `../bia-all-projects/DOCS/shared/rate-limit/central-config.md`.
- Engines (Express, FastAPI, Gradio) copied into every project: `../bia-all-projects/DOCS/shared/rate-limit/engine/`.
- Backends only **read** config (one `MGET`, cached ~90 s per instance) and **write** counters.
  The Sheet is the only writer of config. So moving the controls changes no project code: the
  Ops page writes the same `config:*` keys the Apps Script writes now.

## What the Ops page needs

- Global switches: `config:kill_all`, `config:event_mode` (default / demo).
- Per project: on/off (`config:<project>:enabled`), mode override, per-bucket limits and the window
  for each mode (`config:<project>:<mode>:<bucket>`, `config:<project>:<mode>:window`).
- Counter reset: bump `config:ratelimit_salt` (old counters are abandoned and expire on their own).
- The project list and bucket defaults now come from the Sheet's Projects tab. In the CMS they could
  live in a Postgres table (or on the project record), and the page syncs them to Redis on save.
- Role: **exco admin only** (user decision 2026-11-02): no other CMS role sees or edits these
  controls. Log every change (who, what, before/after) in Postgres.

## Things to watch

- **The website keeps its Upstash credentials.** `docs/cms-setup.md` (steps 5 and 9) now keeps
  `UPSTASH_REDIS_REST_*` in the bia-website Vercel env after cutover, server-side only. If they were
  already removed, add them back before building this.
- **One writer at a time.** The Sheet's "Sync limits to Redis" overwrites config keys. Once the Ops
  page is live, retire the Sheet's sync (or make it read-only) so the two don't fight.
- **Command budget.** The shared Upstash DB is on the free tier (500K commands/month). Page views
  should read with one `MGET`, not one `GET` per key. Pipelines and Lua scripts are billed per inner
  command, so they don't save anything.
- **Counter key format changed in engine v1.4.0** (`../bia-all-projects` commit `65c4d2b`, spec in
  `central-config.md` §3 and §9): `ratelimit:<salt>:<project>:<bucket>:<identity>:<window#>`, where
  identity is the client IP (IPv6 grouped to its /64) or a bot's own id, and
  `window# = floor((now + crc32/fnv(identity) % window) / window)`. Live usage for one visitor
  therefore needs the engine's hash; a simpler "reset this visitor" is a salt bump (resets everyone)
  or deleting `ratelimit:<salt>:<project>:*:<identity>:*` via `SCAN` (costly: avoid on the free
  tier). The `config:*` keys don't change. Projects still on engine 1.3.x use the old key without
  the window number until their next redeploy.
- **Instances react within ~90 s.** Each backend caches config for 90 s and forgets remembered
  blocks when the salt, a limit or the window changes, so the page can say "takes effect within
  about 90 seconds".
