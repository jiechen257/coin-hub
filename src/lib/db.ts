import "dotenv/config";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import { resolveDatabaseRuntimeConfig } from "@/lib/database-runtime";

declare global {
  // Cache the client during dev hot reloads so Prisma doesn't create duplicates.
  var __coinHubPrisma__: PrismaClient | undefined;
}

function createAdapter() {
  const config = resolveDatabaseRuntimeConfig(process.env);

  if (config.kind === "turso") {
    return new PrismaLibSql({
      url: config.url,
      authToken: config.authToken,
    });
  }

  return new PrismaBetterSqlite3({
    url: config.url,
  });
}

const adapter = createAdapter();

export const db =
  globalThis.__coinHubPrisma__ ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__coinHubPrisma__ = db;
}
