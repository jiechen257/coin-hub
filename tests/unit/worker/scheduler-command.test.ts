// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

describe("scheduler command", () => {
  it("points the scheduler script to the deprecation helper", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.scheduler).toBe(
      "node scripts/scheduler-deprecated.cjs",
    );
  });

  it("prints guidance to use pnpm worker", () => {
    const result = spawnSync(
      process.execPath,
      [resolve(process.cwd(), "scripts/scheduler-deprecated.cjs")],
      {
        cwd: process.cwd(),
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(1);
    expect(`${result.stdout}\n${result.stderr}`).toContain("pnpm worker");
  });
});
