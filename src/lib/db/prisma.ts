import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Prisma's native query-engine binary fails to connect at all on this
// machine (confirmed: same bogus P1000 auth error from both the CLI and a
// plain runtime PrismaClient, with zero server-side log activity — the
// connection never leaves the process). The pure-JS pg driver behind this
// adapter bypasses that binary entirely and works fine.
//
// Uses raw process.env (not the validated `env` module) so this file stays
// importable from standalone scripts (e.g. prisma/seed.ts) — @/lib/env is
// guarded with "server-only", which throws outside Next's bundler.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
