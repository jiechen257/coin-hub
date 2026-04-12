// @vitest-environment node

import { db } from "@/lib/db";
import { runDualAssetAnalysis } from "@/modules/runs/run-orchestrator";

describe("run-orchestrator", () => {
  beforeEach(async () => {
    await db.runSnapshot.deleteMany();
  });

  afterEach(async () => {
    await db.runSnapshot.deleteMany();
  });

  it("returns a RunResult with BTC and ETH asset entries", async () => {
    const result = await runDualAssetAnalysis({ mode: "manual" });

    expect(result.assets.BTC).toBeDefined();
    expect(result.assets.ETH).toBeDefined();
  });
});
