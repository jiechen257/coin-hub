import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DEFAULT_LOCAL_DATABASE_URL = "file:./prisma/dev.db";
const localDatabaseUrl = process.env.LOCAL_DATABASE_URL?.trim();
const runtimeDatabaseUrl = process.env.DATABASE_URL?.trim();
const databaseUrl =
  localDatabaseUrl ||
  (runtimeDatabaseUrl?.startsWith("file:")
    ? runtimeDatabaseUrl
    : DEFAULT_LOCAL_DATABASE_URL);

if (!databaseUrl.startsWith("file:")) {
  process.exit(0);
}

const rawPath = databaseUrl.slice("file:".length);
const databasePath = rawPath.startsWith("/") ? rawPath : resolve(process.cwd(), rawPath);

mkdirSync(dirname(databasePath), { recursive: true });

if (!existsSync(databasePath)) {
  writeFileSync(databasePath, "");
}
