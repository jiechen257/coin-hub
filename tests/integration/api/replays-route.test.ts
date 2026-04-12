// @vitest-environment node

import { db } from "@/lib/db";
import { POST, GET } from "@/app/api/replays/route";
import { GET as getReplay } from "@/app/api/replays/[jobId]/route";
import { POST as saveConfig } from "@/app/api/configs/route";

describe("replays api", () => {
  beforeEach(async () => {
    await db.replayJob.deleteMany();
    await db.runSnapshot.deleteMany();
    await db.configVersion.deleteMany();
  });

  afterEach(async () => {
    await db.replayJob.deleteMany();
    await db.runSnapshot.deleteMany();
    await db.configVersion.deleteMany();
  });

  it("creates a replay job for a selected time range and config version", async () => {
    const configResponse = await saveConfig(
      new Request("http://localhost/api/configs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: "replay target",
          params: { riskPct: 0.8 },
        }),
      }),
    );

    const configPayload = (await configResponse.json()) as {
      version: { id: string };
    };

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
        createdAt: new Date("2026-01-15T00:00:00.000Z"),
      },
    });

    const response = await POST(
      new Request("http://localhost/api/replays", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "2026-01-01",
          to: "2026-02-01",
          configVersionId: configPayload.version.id,
        }),
      }),
    );

    expect(response.status).toBe(202);

    const data = (await response.json()) as {
      jobId: string;
      replay: { status: string; result: { snapshotCount: number } };
    };

    expect(data.jobId).toBeDefined();
    expect(data.replay.status).toBe("completed");
    expect(data.replay.result.snapshotCount).toBe(1);

    const stored = await db.replayJob.findUnique({
      where: { id: data.jobId },
    });

    expect(stored?.status).toBe("completed");
    expect(stored?.configVersionId).toBe(configPayload.version.id);
    expect(stored?.fromTime.toISOString()).toContain("2026-01-01");
    expect(stored?.toTime.toISOString()).toContain("2026-02-01");
  });

  it("lists replay jobs and returns replay details", async () => {
    const replay = await db.replayJob.create({
      data: {
        fromTime: new Date("2026-01-01T00:00:00.000Z"),
        toTime: new Date("2026-01-02T00:00:00.000Z"),
        status: "completed",
        resultJson: {
          snapshotCount: 2,
          assetCount: 4,
        },
        completedAt: new Date("2026-01-02T01:00:00.000Z"),
      },
    });

    const listResponse = await GET();
    expect(listResponse.status).toBe(200);

    const listPayload = (await listResponse.json()) as {
      replays: Array<{ id: string; status: string }>;
    };

    expect(listPayload.replays.some((job) => job.id === replay.id)).toBe(true);

    const detailResponse = await getReplay(
      new Request(`http://localhost/api/replays/${replay.id}`),
      {
        params: Promise.resolve({ jobId: replay.id }),
      } as never,
    );

    expect(detailResponse.status).toBe(200);

    const detailPayload = (await detailResponse.json()) as {
      replay: { id: string; result: { snapshotCount: number } | null };
    };

    expect(detailPayload.replay.id).toBe(replay.id);
    expect(detailPayload.replay.result?.snapshotCount).toBe(2);
  });
});
