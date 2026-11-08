# Suggestions: each project's AI model and spend in the CMS

> **SUGGESTIONS ONLY. Nothing here is decided or built.** Rough findings from `../bia-all-projects`
> (2026-11-08), meant to be folded into the Ops / Systems pages (`docs/rate-limit-ops-plan.md`) if the club
> wants them.

## What exists today

- **Models:** each deployed demo reads its models from env (`MODEL_NAME`, `VISION_MODEL_NAME`,
  `<PURPOSE>_MODEL_NAME`), baked into its `DOTENV` GitHub secret. Changing a model means editing `.env`,
  re-uploading `DOTENV` and redeploying. On 2026-11-08 the projects were on a mix of models: `deepseek-v4-flash`,
  `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gpt-5-mini`, `gpt-5.4-nano`, `claude-haiku-4-5`. The club
  default is moving to `deepseek-v4-1-flash-260910` (text + vision).
- **Keys and budgets:** every project has its own apiyi key, created by the AI Lodge key bot
  (`AIL-key-bot`, `/addservicekey ☁️ deployments (apiyi) | <slug>`) as an "artificial member" in its Notion
  database. Each key has a hard spend limit (NoWaste's: $5) and an optional model whitelist. The bot manages these
  through apiyi's management API (new-api: `/api/token/…` with a logged-in admin session; `get_key_usage`,
  `update_key`, `update_model_limits` in `src/services/apiyi_client.py`).
- **Reading usage with a project's own key works** (tested 2026-11-08, read-only):
  - `GET https://api.apiyi.com/v1/dashboard/billing/subscription` → `hard_limit_usd: 5`
  - `GET https://api.apiyi.com/v1/dashboard/billing/usage` → `total_usage: 2.8318`. new-api reports this in
    **cents** like OpenAI (so about $0.03), but confirm before showing it.
  - `/api/usage/token` and `/api/log/token` are not available on apiyi.

## Suggestion 1: show model and spend per project (read-only)

- **Don't put 30+ inference keys in the CMS.** Instead, each backend reports its own figures: the planned deep health
  check (`/api/health?deep=1`, behind `MONITOR_TOKEN`) also returns
  `{ models: {MODEL_NAME, VISION_MODEL_NAME, …}, spend: {usedUsd, limitUsd} }`. It reads the billing endpoints
  above with the key it already holds. The hourly sweep stores it next to the uptime data.
- **On the Systems page, per project:** current models, spend against limit (a meter, not text), and
  spend over the last 7/30 days (daily snapshots from the sweep). **Club-wide:** total spend, the projects closest to
  their limit, and an alert when one passes 80%.
- **Cost:** a few extra cents of nothing. Billing endpoints don't spend tokens.

## Suggestion 2: change a project's model from the CMS (no redeploy)

- Same pattern as rate limits. The Ops page writes `config:<fullSlug>:model:<purpose>` (e.g. `…:model:text`,
  `…:model:vision`) to Upstash. The shared engine package gets a small `resolveModel(purpose)` helper that reads it
  (cached ~90 s), falling back to the env var. A global `config:model:default:<purpose>` lets the club switch every
  project's default at once.
- **Guard rails:**
  - Only offer models from the apiyi list (`GET /v1/models`), tagged with what each accepts (text / image).
  - Never offer `deepseek-v4-flash` for vision: it silently ignores images.
  - Show a "test call" button that runs the deep check after a change.
- **Catch:** the project's apiyi key may have a model whitelist. A model not on it is refused with 403. Either the
  Ops page also updates the key's whitelist (it would need apiyi admin credentials, see below), or the whitelist is
  kept broad for service keys.

## Suggestion 3: change a project's budget from the CMS

- **Options:**
  - (a) The CMS gets apiyi admin credentials and calls the same `/api/token/` endpoints the key bot uses.
    One more place holding an all-powerful credential.
  - (b) The key bot exposes a tiny authenticated HTTP endpoint (`POST /limits`) that the CMS calls. The credential
    stays in one place.
  - (c) Keep budgets in the key bot only and show them read-only in the CMS (Suggestion 1).
- **Leaning:** (c) now, (b) if editing from the CMS becomes a real need. Budget changes are rare, and the key bot
  already has the audit trail in Notion.

## Open questions

- Is a $5 hard limit per project right for showcase traffic? An event week could use it up. Consider pairing event
  mode with a temporary limit bump through the key bot.
- Should spend history live in the same Neon tables as uptime history (1 year)? It's one row per project per day,
  which is negligible.
