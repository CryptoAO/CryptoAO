import { Prisma, PrismaClient } from "@prisma/client";
// Must run before PrismaClient is constructed: on a demo deployment it
// copies the bundled seed database to /tmp and points DATABASE_URL at it.
import "./demo";

// Singleton Prisma client (survives Next.js dev hot-reload).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Money-moving transactions run at Serializable isolation on Postgres so
// concurrent balance checks can't interleave (TOCTOU). SQLite rejects the
// option but is single-writer, which serializes writes anyway.
export const moneyTxOptions: { isolationLevel: Prisma.TransactionIsolationLevel } | undefined =
  (process.env.DATABASE_URL ?? "").startsWith("postgres")
    ? { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    : undefined;

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
