import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

const srcPath = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": srcPath,
    },
  },
  test: {
    environment: "jsdom",
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
    // Current integration tests share one SQLite file, so run files serially to avoid cross-file DB resets.
    fileParallelism: false,
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
