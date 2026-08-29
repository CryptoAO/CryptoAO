# Deploying

Two very different things live under this heading, and conflating them is
how demo credentials end up in production. Read the one you mean.

- **[Demo](#demo-deployment)** — a throwaway you can click through. Fake
  money, fake SMS, data that resets. Private by default.
- **[Production](#production-deployment)** — real people, real payouts.
  Everything the demo fakes has to be real, and `docs/LAUNCH.md` is the
  gate it has to pass first.

---

## Demo deployment

### What makes it work

A test deployment on serverless hosting has no database, no secrets, and a
read-only filesystem except `/tmp`. `src/lib/demo.ts` closes that gap: the
demo build bakes a seeded SQLite file into the bundle, and each instance
copies it to `/tmp` at cold start and derives `DATABASE_URL`,
`PRIVATE_STORAGE_DIR`, and `SESSION_SECRET` from it.

**The seed file is the marker.** `DEMO_MODE` is `existsSync(prisma/demo-seed.db)`
— nothing else. Only the demo build command creates that file, so a real
deployment can never drift into demo mode, and the strict "no secret, no
boot" guard in `session.ts` still applies. Every assignment uses `||=`, so
anything you configure explicitly beats the demo derivation.

`next.config.ts` carries the file into the serverless bundle:

```ts
outputFileTracingIncludes: { "/**": ["./prisma/demo-seed.db"] }
```

### Vercel settings

The app lives in `hanapgawa/`, not at the repo root, so the install step
fetches the subdirectory itself. Root Directory stays at the repo root.

**Install Command**

```sh
git clone --depth 1 --branch <branch> https://github.com/<owner>/<repo>.git __src \
  && cp -a __src/hanapgawa/. . && rm -rf __src && npm ci
```

**Build Command**

```sh
DATABASE_URL=file:./demo-seed.db npx prisma db push --skip-generate \
  && DATABASE_URL=file:./demo-seed.db npx tsx prisma/seed.ts \
  && npm run build
```

`file:./demo-seed.db` looks wrong and is not. Prisma resolves a relative
SQLite URL against the **schema** directory (`prisma/`), not the working
directory, so this writes `prisma/demo-seed.db` — exactly where `demo.ts`
looks. Writing `file:./prisma/demo-seed.db` produces `prisma/prisma/demo-seed.db`
and a demo that silently boots without its seed.

No environment variables are required. That is the point.

The install command clones over HTTPS with no credentials, so **the repo
must be public for it to succeed.** If you make the repo private, switch
the project to a real Git integration (Root Directory `hanapgawa`) instead
of patching the clone — a token in an install command is a token in the
build log.

### Keeping it private

Vercel Authentication (`ssoProtection`) restricts the deployment to people
who can log into the Vercel team. Confirm rather than assume:

```
get_project_deployment_protection → ssoProtection.enabled === true
```

A new project's **first** deployment is promoted to `production` even when
you request a preview target. That is fine — `all_except_custom_domains`
covers production and preview alike — but check it if you assumed the
demo was preview-only.

Anonymous `curl` from a sandboxed agent proves nothing here: the egress
proxy returns its own `403 CONNECT tunnel failed` before the request
reaches Vercel. Use `web_fetch_vercel_url`, or a browser.

### Demo accounts

Client `09170000006` · provider `09170000002` · admin `09170000001`,
password `password123` for all three. The amber banner in the UI says the
same, because a tester who has to hunt for credentials is a tester who
files "login broken".

### Limits to state out loud

`/tmp` is per-instance and ephemeral, so demo data resets on cold starts
and two concurrent instances can disagree. The session secret is derived
from the seed — stable across instances of one build, rotated by every
redeploy, so a redeploy logs everyone out. Money is a ledger of made-up
centavos. SMS OTPs are echoed to the screen (`devSmsEcho()`), which trades
away anti-enumeration; that is acceptable in a demo and nowhere else.

---

## Production deployment

Do not promote the demo. Deploy the same code with real infrastructure.

| Concern | Demo | Production |
| --- | --- | --- |
| Database | bundled SQLite in `/tmp` | Postgres (`DATABASE_URL`) |
| Session secret | derived from the seed | 32+ random bytes in `SESSION_SECRET` |
| KYC / evidence files | `/tmp` | durable object storage (`PRIVATE_STORAGE_DIR`) |
| SMS | echoed on screen | `SMS_PROVIDER=semaphore` + credentials |
| Money | fake | real rails, reconciled daily |

Postgres is not optional. The escrow ledger's correctness rests on
`Serializable` transactions (`moneyTxOptions`), and the money paths were
written for a database that honours them under concurrency.

`prisma/demo-seed.db` must not exist in a production build — if it does,
`DEMO_MODE` is on and the derived secret is a secret anyone holding the
bundle can recompute. The production build command runs plain
`npm run build`, which never creates it.

Work `docs/LAUNCH.md` end to end before the first real user. `docs/OPERATIONS.md`
covers what to watch once they arrive.
