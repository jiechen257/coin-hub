import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

if (!databaseUrl.startsWith("file:")) {
  process.exit(0);
}

const rawPath = databaseUrl.slice("file:".length);
const databasePath = rawPath.startsWith("/") ? rawPath : resolve(process.cwd(), rawPath);

mkdirSync(dirname(databasePath), { recursive: true });

if (!existsSync(databasePath)) {
  writeFileSync(databasePath, "");
}
