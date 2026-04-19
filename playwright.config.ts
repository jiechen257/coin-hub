import { defineConfig, devices } from "playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `${process.execPath} -e "const fs=require('node:fs');fs.rmSync('./prisma/e2e.db',{force:true});fs.writeFileSync('./prisma/e2e.db','')" && ${process.execPath} ./node_modules/prisma/build/index.js migrate deploy && ${process.execPath} ./node_modules/next/dist/bin/next dev`,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? "file:./prisma/e2e.db",
      LOCAL_DATABASE_URL:
        process.env.LOCAL_DATABASE_URL ?? "file:./prisma/e2e.db",
      TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ?? "",
      TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ?? "",
    },
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
