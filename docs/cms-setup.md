# CMS setup and cutover checklist

Everything to configure before merging `feat/cms` into `main` (which auto-deploys
smubia.com). Most steps are in web consoles. Do them in order.

## 0. Try it locally first (no accounts needed)

```bash
npm install
npm run dev
```

- Without `DATABASE_URL` the site uses an embedded Postgres in `.data/pglite`.
- To fill it with the live projects (read-only from Redis): stop the dev server, then run
  `npm run db:import-redis -- --commit`. It needs the existing `UPSTASH_REDIS_REST_*` in `.env.local`.
- Open `/admin`, pick a role under **Local development only**, and you're in.
- Without a Telegram token, posts and tests are printed to the dev server console.
- Without `BLOB_READ_WRITE_TOKEN`, uploads land in `public/uploads/` (git-ignored).

## 1. Neon database (connection string)

The site uses our own Neon project, attached with a connection string. It does not use the
Vercel ↔ Neon integration, so Vercel creates no database and no per-preview branches.

1. In console.neon.tech, open the project and copy the connection string of the branch that
   holds the CMS content (**Connect**).
2. In Vercel → **bia-website** → **Settings** → **Environment Variables**, set it as
   `DATABASE_URL` for **Production**.
3. Set `DATABASE_URL` for **Preview** too: `vercel-build` fails without it. Decide what previews
   point at, because **every preview build runs migrations against that database and every preview
   edit is written to it**:
   - **Recommended:** create a `preview` branch in the Neon console and use its connection string.
     Testing then can't touch the real content. Refresh the branch from `main` when it goes stale.
   - **Or** use the same string as Production. Edits on a preview are then live edits.

Nothing else to do: the `vercel-build` script runs migrations before every build.

## 2. Copy the live projects into Neon (your machine)

The live site keeps reading Redis until the merge, so this is safe to do early.

1. In console.neon.tech, open the project, then **Connect**, and copy the connection string for the
   **production** branch.
2. Temporarily add it to `.env.local` as `DATABASE_URL=...`. Don't use `vercel env pull`: it
   overwrites `.env.local`.
3. Run these:
   ```bash
   npm run db:migrate
   npm run db:import-redis              # dry run: review the list
   npm run db:import-redis -- --commit
   ```
4. Remove `DATABASE_URL` from `.env.local` again if you want local dev back on PGlite.

Re-running the import later only adds projects that are new in Redis. Avoid editing
projects in the old `/admin` between this step and the merge. If you have to, re-run with
`--overwrite`, which replaces the Postgres copy of every project with the Redis version.

## 3. Google sign-in (Google Cloud console)

1. Go to console.cloud.google.com. Use the club Google account and create (or pick) a project, e.g. `smubia-cms`.
2. Open **APIs & Services**, then **OAuth consent screen**.
   - User type: **Internal** if the project lives in SMU's Google Workspace; otherwise **External**.
   - App name "SMUBIA CMS", support email, and authorised domain `smubia.com`.
   - If External: set the publishing status to **In production**. In "Testing", only listed test users
     can sign in. The basic `openid email profile` scopes need no Google review.
3. Open **Credentials**, then **Create credentials**, then **OAuth client ID**, then **Web application**.
   - **Authorised JavaScript origins**:
     `https://www.smubia.com`, `http://localhost:3000`, and the branch preview URL (step 6).
   - **Authorised redirect URIs**:
     - `https://www.smubia.com/api/auth/callback/google`
     - `http://localhost:3000/api/auth/callback/google`
     - `https://<branch-preview-host>/api/auth/callback/google`
4. Copy the client ID and secret into `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` (step 5).

Preview deployments also get a per-deployment URL with a hash in it. Sign-in only works on
the stable branch URL you registered, e.g. `bia-website-git-feat-cms-<team>.vercel.app`.

## 4. Telegram bot

1. In Telegram, message **@BotFather**, send `/newbot`, and pick a name and username (e.g. `smubia_bot`).
   Copy the token.
2. Add the bot to the DAP channel as an **admin** with **Post messages** permission.
3. Channel ID: use `@channelusername` for a public channel. For a private channel, forward
   one of its posts to **@userinfobot** to get the `-100…` ID.
4. Anyone who wants a test send must open the bot and press **Start** once. Their user ID
   comes from **@userinfobot**.

## 5. Environment variables (Vercel → Settings → Environment Variables)

| Variable | Production | Preview | Value |
|---|---|---|---|
| `DATABASE_URL` | ✓ | ✓ | Neon connection string from step 1. Migrations run against it on every build |
| `AUTH_SECRET` | ✓ | ✓ | `npx auth secret` (or `openssl rand -base64 32`), a different one per environment |
| `AUTH_GOOGLE_ID` | ✓ | ✓ | From step 3 |
| `AUTH_GOOGLE_SECRET` | ✓ | ✓ | From step 3 |
| `CMS_BOOTSTRAP_ADMINS` | ✓ | ✓ | Your `@smu.edu.sg` email (comma-separate several) |
| `TELEGRAM_BOT_TOKEN` | ✓ | optional | From step 4. Leave it off Preview to keep previews from posting |
| `TELEGRAM_BOT_USERNAME` | ✓ | ✓ | Bot username without `@` (shown in the editor) |
| `TELEGRAM_DAP_CHANNEL_ID` | ✓ | optional | From step 4 |
| `CRON_SECRET` | ✓ | | Any long random string (Vercel Cron sends it automatically) |
| `AILODGE_REVALIDATE_URL` | ✓ | | `https://ailodge.smubia.com/api/revalidate` |
| `AILODGE_REVALIDATE_SECRET` | ✓ | | Long random string, e.g. `openssl rand -hex 32`. Set the same value as `REVALIDATE_SECRET` on the AI Lodge site's Vercel project |
| `NEXT_PUBLIC_SITE_URL` | `https://www.smubia.com` | (leave unset) | Absolute links in Telegram posts |
| `BLOB_READ_WRITE_TOKEN` | already set | already set | Unchanged |

Keep `ADMIN_PASSWORD` until step 9. Keep `UPSTASH_REDIS_REST_*` for good (server-side only, never
`NEXT_PUBLIC_`): the planned rate-limit Ops page writes the shared limiter's config with them
(`docs/rate-limit-ops-plan.md`).

## 6. Test on a preview deployment

1. `git push -u origin feat/cms`. Vercel builds a preview against the Preview `DATABASE_URL`. It
   runs migrations first, so a failed build usually means `DATABASE_URL` is missing.
2. Open the **branch URL** (Vercel → Deployments → the feat/cms deployment → Domains). Add it
   to the Google OAuth client from step 3 if you haven't yet.
3. Check: `/projects`, `/projects/ailodge`, a project page (e.g. `/projects/ailodge/ay2627-s1/scamsense`),
   `/projects/dap`, `/dap` and its current cohort page (`/dap/ay2627`), `/work-with-us`, and `/admin` sign-in. Then the old links, which
   should all redirect: `/Projects`, `/DAP`, `/WorkWithUs`, `/ContactUs`, `/Projects?badge=DAP`,
   `/Projects?badge=AI%20Lodge`. An old project link (`/Projects/scamsense`) should show "Projects have moved".
4. Edits made on the preview go to the Preview `DATABASE_URL` (step 1). They only stay out of
   production if that is a separate Neon branch.

## 7. Merge

1. Merge `feat/cms` into `main`. Production deploys against the Neon production branch.
2. In production `/admin`, sign in with the bootstrap email, then:
   - Pick the AI Lodge semester in the sidebar switcher. On **Overview**, create the Hack Day
     tracks and the lodges (each with a link to its page on ailodge.smubia.com), add the write-up
     and Hack Day details, and set visibility. On **Projects**, move each project into its track,
     set its lodge, and mark one winner per track.
   - Switch to the DAP cohort. On **Overview**, check it is current. On **Groups**, add each
     group's members and mentors, then fill in the **Schedule** and pick each week's group.
   - **All projects**: fill in the Made for / Built with facets.
   - **Settings › Site Links**: check the application forms, the "applications open" switches, the
     emails, and add the prospectus PDF link if you have one. Every join button uses these.
   - **People and roles**: add exco admins, DAP exco and AI Lodge exco.
     After that you can clear `CMS_BOOTSTRAP_ADMINS`.

## 8. Backups and Claude access

- Backups: follow `ops/db-backup/README.md` (private repo, one secret, done).
- Claude: each person opens **Settings › Access tokens** in `/admin`, creates a token and runs
  the `claude mcp add …` command it shows. The token acts as them, with their role. The server URL
  is part of that config, so moving from localhost to production means running
  `claude mcp remove smubia-cms -s local`, then adding it again with `https://www.smubia.com/api/mcp`.
  Tokens live in the database, so an existing token keeps working if production uses the same Neon
  branch; otherwise create a new one in production. Then ask
  things like "add this project as a draft", "make Leash the Agents winner", "close PandAI
  Lodge" or "draft week 6's issue". The tools can create, edit, publish and schedule, but
  never delete. Revoke a token on the same page.

## 9. After a week of the new CMS running cleanly

- Remove `ADMIN_PASSWORD` and the retired `CMS_MCP_TOKEN` from the bia-website Vercel env. Leave
  `UPSTASH_REDIS_REST_*` in place: the rate-limit Ops page needs them (`docs/rate-limit-ops-plan.md`).
- Hand `../bia-all-projects/NOTES-bia-website-cms.md` to the other agent: it covers repointing the
  writeup skill and deleting the website's old keys from the shared Redis.

## Notes

- **Scheduled issues** go out at about 9am SGT on their date. Vercel Hobby runs the daily cron
  some time within that hour.
- **Local builds** (`npm run build` without `DATABASE_URL`) prerender against an empty in-memory
  database. That's expected, and the real data appears at runtime. Vercel builds use Neon.
- **URL rule:** never delete a public path; redirect it (see CLAUDE.md → URL Paths).
