// @vitest-environment node

import { db } from "@/lib/db";
import { evaluateReplay } from "@/modules/replay/replay-evaluator";

describe("replay-evaluator", () => {
  beforeEach(async () => {
    await db.replayJob.deleteMany();
    await db.runSnapshot.deleteMany();
  });

  afterEach(async () => {
    await db.replayJob.deleteMany();
    await db.runSnapshot.deleteMany();
  });

  it("evaluates run snapshots in a time range and stores a completed replay job", async () => {
    await db.runSnapshot.create({
      data: {
        mode: "manual",
        strategyVersion: "v1",
        warningsJson: [],
        assetsJson: {
          BTC: { symbol: "BTC" },
          ETH: { symbol: "ETH" },
        },
        inputRefsJson: null,
        degradedAssetsJson: [],
        createdAt: new Date("2026-04-02T00:00:00.000Z"),
      },
    });

    const result = await evaluateReplay({
      fromTime: new Date("2026-04-01T00:00:00.000Z"),
      toTime: new Date("2026-04-03T00:00:00.000Z"),
    });

    const stored = await db.replayJob.findUnique({
      where: { id: result.id },
    });

    expect(result.status).toBe("completed");
    expect(result.result?.snapshotCount).toBe(1);
    expect(stored?.status).toBe("completed");
  });
});
