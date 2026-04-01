import "dotenv/config";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL is required to initialize Prisma.");
  }

  return url;
}

declare global {
  // Cache the client during dev hot reloads so Prisma doesn't create duplicates.
  var __coinHubPrisma__: PrismaClient | undefined;
}

const adapter = new PrismaBetterSqlite3({
  url: getDatabaseUrl(),
});

export const db =
  globalThis.__coinHubPrisma__ ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__coinHubPrisma__ = db;
}
