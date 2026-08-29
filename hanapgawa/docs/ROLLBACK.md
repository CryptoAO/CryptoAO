# Rollback plan

One page, written before it is needed. The launch-week on-call keeps this
open in a tab. Times assume Vercel + managed Postgres; adjust once the
real providers are chosen.

## What triggers a rollback

Roll back **immediately, without debate**, when any of these is true on
the newly deployed version:

1. **Money is wrong.** Any ledger imbalance (`SUM(amountCents)` per user
   drifting from expected), a double-release, or an escrow hold that
   doesn't appear in the ledger. One confirmed case is enough.
2. **Login is broken** for existing users (not a single account — the
   population).
3. **Error rate** on `/api/*` exceeds ~5% of requests for more than 5
   minutes, or `/api/health` fails its uptime checks.
4. **A security regression** — an authz check gone, PII visible where it
   wasn't.

Do **not** roll back for: a cosmetic defect, one user's complaint that
isn't reproducible, or a slow page. Fix forward.

## Who decides

The named launch-week on-call decides alone — waiting for consensus is
how five minutes becomes an hour. If the founder is the on-call, that's
the founder. The decision is announced in the incident channel *after*
it's executed, not before.

## How — application rollback (minutes)

The app is stateless; every deployment is immutable on Vercel.

1. Vercel dashboard → project → Deployments → previous known-good
   deployment → **Promote to Production**. (CLI: `vercel promote <url>`.)
2. Verify `/api/health` and one read endpoint on the promoted deployment.
3. Announce in the incident channel: what was rolled back, why, and what
   the fix-forward plan is.

Expected time: **under 5 minutes.** No data is touched.

## How — database rollback (the careful one)

The schema is managed by Prisma. Two distinct cases:

**A migration that added things (columns, tables, indexes).** The old app
code ignores new columns — roll back the app only (above) and leave the
schema in place. This is the common case and it is why migrations here
must stay additive: never rename or drop in the same release that stops
using something.

**A migration that destroyed or transformed data.** This is what backups
are for. Restore procedure, rehearsed 2026-08-29 on Postgres 16:

```sh
pg_dump  -Fc <prod-url> -f backup.dump          # taken BEFORE the migration
pg_restore -d <fresh-database-url> backup.dump   # restore into a NEW db
# verify: row counts and SUM("amountCents") on LedgerEntry match the
# pre-migration values, then repoint DATABASE_URL and redeploy.
```

Rehearsal result: dump + restore of the seeded schema reproduced
identical row counts and an identical ledger sum (₱1,600.00, 8 entries).
Managed-Postgres providers also offer point-in-time recovery — prefer it
when available; the manual path above is the floor, not the ceiling.

**Rules that make rollback possible at all:**
- Take a `pg_dump` (or provider snapshot) immediately **before** every
  migration. No dump, no deploy.
- Migrations are additive-first: drop/rename only in a later release,
  after the code that used the old shape is gone.
- Never run a destructive migration and a behavior change in the same
  deploy — you can't tell which one broke things.

## Migration rehearsal record (2026-08-29)

Performed on a scratch PostgreSQL 16 cluster:

- `prisma db push` with the schema's provider set to `postgresql`
  applied **cleanly with zero schema edits** (`prisma/schema.postgres.prisma`
  is the committed variant — same schema, provider line only).
- Seed ran unmodified.
- The full escrow lifecycle executed against Postgres over the real API:
  top-up → post → offer → accept (Serializable hold) → start → done →
  complete. Split exact to the centavo (₱500 → ₱440 payout at 12%);
  double-accept correctly rejected with 409.
- Backup/restore rehearsed as above.

What this does **not** prove: behavior under concurrent production load,
and the managed provider's own backup automation — verify both on the
real instance before launch (the backups blocker in the launch gate).

## Feature flags

The riskiest feature (real payments) is controlled by configuration:
`SMS_PROVIDER` and `PAYMONGO_SECRET_KEY` absent means simulated rails.
Unsetting the PayMongo key and redeploying is the payment kill-switch —
existing ledger balances are unaffected because the ledger never depended
on the provider.
