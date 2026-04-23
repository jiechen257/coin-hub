import { config as loadDotenv } from "dotenv";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

function loadNextStyleEnv() {
  const nodeEnv =
    process.env.NODE_ENV === "production"
      ? "production"
      : process.env.NODE_ENV === "test"
        ? "test"
        : "development";
  const envFiles = [
    `.env.${nodeEnv}.local`,
    ...(nodeEnv === "test" ? [] : [".env.local"]),
    `.env.${nodeEnv}`,
    ".env",
  ];

  for (const envFile of envFiles) {
    const envPath = resolve(process.cwd(), envFile);

    if (!existsSync(envPath)) {
      continue;
    }

    loadDotenv({
      path: envPath,
      override: false,
      quiet: true,
    });
  }
}

loadNextStyleEnv();

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
