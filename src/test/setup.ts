import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import "@testing-library/jest-dom/vitest";

declare global {
  var __coinHubTestDbPrepared__: boolean | undefined;
}

const TEST_DATABASE_URL = "file:./prisma/test.db";

function prepareTestDatabase() {
  if (globalThis.__coinHubTestDbPrepared__) {
    return;
  }

  const env = {
    ...process.env,
    DATABASE_URL: TEST_DATABASE_URL,
    LOCAL_DATABASE_URL: TEST_DATABASE_URL,
    TURSO_DATABASE_URL: "",
    TURSO_AUTH_TOKEN: "",
  };
  const testDatabasePath = resolve(process.cwd(), "prisma/test.db");
  const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

  if (existsSync(testDatabasePath)) {
    rmSync(testDatabasePath);
  }

  execFileSync("node", ["./scripts/prepare-local-db.mjs"], {
    cwd: process.cwd(),
    env,
    stdio: "ignore",
  });
  execFileSync(pnpmCommand, ["exec", "prisma", "migrate", "deploy"], {
    cwd: process.cwd(),
    env,
    stdio: "ignore",
  });

  globalThis.__coinHubTestDbPrepared__ = true;
}

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.LOCAL_DATABASE_URL = TEST_DATABASE_URL;
delete process.env.TURSO_DATABASE_URL;
delete process.env.TURSO_AUTH_TOKEN;

prepareTestDatabase();

class ResizeObserverMock {
  observe() {}

  unobserve() {}

  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);
