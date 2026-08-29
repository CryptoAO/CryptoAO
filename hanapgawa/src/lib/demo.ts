// Demo mode: a self-contained, self-resetting deployment.
//
// A test deployment on serverless hosting has no database, no secrets, and
// a read-only filesystem except /tmp. Demo mode makes the app runnable
// there anyway: the demo build bakes a seeded SQLite file into the bundle,
// and at cold start each instance copies it to /tmp and derives its
// configuration from it.
//
// The marker IS the seed file. It exists only when the build ran the demo
// build command (see vercel.json in the deploy payload / docs/LAUNCH.md),
// so a real production deployment — Postgres, real SESSION_SECRET — never
// trips into this path, and the strict "no secret, no boot" guard in
// session.ts still protects it.
//
// Honest limits, by design: /tmp is per-instance and ephemeral, so demo
// data resets on cold starts and can differ between concurrent instances;
// the session secret is derived (stable across instances of one build,
// rotated by every redeploy); money and SMS are fake. The UI says so.

import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const SEED_PATH = path.join(process.cwd(), "prisma", "demo-seed.db");

export const DEMO_MODE = existsSync(SEED_PATH);

if (DEMO_MODE) {
  const dir = process.env.VERCEL ? "/tmp/hanapgawa-demo" : path.join(process.cwd(), "var", "demo");
  mkdirSync(dir, { recursive: true });

  const dbPath = path.join(dir, "demo.db");
  if (!existsSync(dbPath)) copyFileSync(SEED_PATH, dbPath);

  // ||= throughout: anything explicitly configured always wins over demo
  // derivation, so demo mode can never override a real setting.
  process.env.DATABASE_URL ||= `file:${dbPath}`;
  process.env.PRIVATE_STORAGE_DIR ||= path.join(dir, "private");

  // Stable across every instance serving this build (all hash the same
  // bundled seed), rotated by any redeploy. Fine for a demo whose accounts
  // all share the password "password123"; never active outside demo mode.
  process.env.SESSION_SECRET ||= createHash("sha256")
    .update("hanapgawa-demo:")
    .update(readFileSync(SEED_PATH))
    .digest("hex");
}
