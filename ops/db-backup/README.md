# Database backups

Neon's free plan only keeps a short restore window, so a GitHub Action takes a
nightly `pg_dump` and keeps each one for 30 days as a workflow artifact.

## Setup (once)

1. In the club GitHub org, create a **private** repo, e.g. `bia-db-backups`.
   It must be private: anyone who can read a repo can download its artifacts,
   and the dump includes the CMS People list (emails).
2. Copy `backup.yml` from this folder to `.github/workflows/backup.yml` in that repo.
3. In Neon (console.neon.tech → your project → **Roles**), optionally create a
   read-only role for backups. Copy the production branch's connection string
   (**Connect** → pooled off, the `postgresql://…` URL).
4. In the backup repo: **Settings → Secrets and variables → Actions → New
   repository secret** named `NEON_DATABASE_URL` with that string.
5. **Actions → Nightly database backup → Run workflow** to check it works.

Private repos on GitHub Free get 2,000 Actions minutes and 500 MB of artifact
storage a month. A run takes about a minute and the dumps are a few MB.

## Restoring

Download the artifact from the run you want (Actions → run → Artifacts), unzip
it, then restore into a fresh Neon branch first and check it before pointing
production at it:

```bash
pg_restore --no-owner --no-privileges --clean --if-exists -d "$TARGET_DATABASE_URL" smubia-cms-<stamp>.dump
```
