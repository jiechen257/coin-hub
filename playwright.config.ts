import { defineConfig, devices } from "playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  use: {
    // Keep Playwright on the same origin Next dev server uses to avoid dev-resource CORS blocks.
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
    // Force Next dev to use the same Node runtime as Playwright to avoid
    // native module ABI drift between nvm/homebrew installations.
    command: `${process.execPath} ./node_modules/next/dist/bin/next dev`,
    env: {
      APP_PASSWORD: process.env.APP_PASSWORD ?? "secret-pass",
      DATABASE_URL: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
    },
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
