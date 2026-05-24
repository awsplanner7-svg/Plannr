import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function initSqlitePragmas(prisma: PrismaClient) {
  await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
  await prisma.$queryRawUnsafe("PRAGMA foreign_keys = ON;");
  await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 10000;");
  await prisma.$queryRawUnsafe("PRAGMA synchronous = NORMAL;");
}

// PRAGMAs are SQLite-only. On Postgres (Railway) they raise a syntax error
// and kill the process at boot. Detect provider via the DATABASE_URL protocol.
if (process.env.DATABASE_URL?.startsWith("file:")) {
  initSqlitePragmas(prisma);
}

export { prisma };
