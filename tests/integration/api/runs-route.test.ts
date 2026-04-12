// @vitest-environment node

import { db } from "@/lib/db";
import { GET } from "@/app/api/runs/route";
import { GET as getRun } from "@/app/api/runs/[runId]/route";

describe("runs api", () => {
  beforeEach(async () => {
    await db.runSnapshot.deleteMany();
  });

  afterEach(async () => {
    await db.runSnapshot.deleteMany();
  });

  it("lists run snapshots and returns run details", async () => {
    const run = await db.runSnapshot.create({
      data: {
        mode: "manual",
        strategyVersion: "v1",
        warningsJson: ["watch BTC"],
        assetsJson: {
          BTC: {
            symbol: "BTC",
            confidence: 0.74,
            status: "ready",
            evidence: ["BTC baseline scan"],
          },
          ETH: {
            symbol: "ETH",
            confidence: 0.71,
            status: "ready",
            evidence: ["ETH baseline scan"],
          },
        },
        inputRefsJson: { mode: "manual" },
        degradedAssetsJson: [],
      },
    });

    const listResponse = await GET();
    expect(listResponse.status).toBe(200);

    const listPayload = (await listResponse.json()) as {
      runs: Array<{ id: string; mode: string }>;
    };

    expect(listPayload.runs.some((item) => item.id === run.id)).toBe(true);

    const detailResponse = await getRun(
      new Request(`http://localhost/api/runs/${run.id}`),
      {
        params: Promise.resolve({ runId: run.id }),
      } as never,
    );

    expect(detailResponse.status).toBe(200);

    const detailPayload = (await detailResponse.json()) as {
      run: { id: string; assets: Record<string, { symbol: string }> };
    };

    expect(detailPayload.run.id).toBe(run.id);
    expect(detailPayload.run.assets.BTC.symbol).toBe("BTC");
  });
});
