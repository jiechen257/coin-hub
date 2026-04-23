import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { defineConfig } from "prisma/config";
import { resolvePrismaCliDatabaseUrl } from "./src/lib/database-runtime";

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

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: resolvePrismaCliDatabaseUrl(process.env),
  },
});
