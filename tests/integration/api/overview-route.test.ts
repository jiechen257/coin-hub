// @vitest-environment node

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { GET } from "@/app/api/overview/route";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

describe("overview api", () => {
  const fixedNow = new Date("2026-04-11T13:00:00.000Z");

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
    await db.replayJob.deleteMany();
    await db.job.deleteMany();
    await db.runSnapshot.deleteMany();
    await db.configVersion.deleteMany();
  });

  afterEach(async () => {
    await db.replayJob.deleteMany();
    await db.job.deleteMany();
    await db.runSnapshot.deleteMany();
    await db.configVersion.deleteMany();
    vi.useRealTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("returns the overview payload for the strategy homepage", async () => {
    const activeConfig = await db.configVersion.create({
      data: {
        summary: "guardrails v12",
        paramsJson: { riskPct: 0.7 },
        isActive: true,
      },
    });

    await db.runSnapshot.create({
      data: {
        mode: "manual",
        strategyVersion: "baseline-v2",
        warningsJson: ["watch BTC"],
        assetsJson: {
          BTC: {
            status: "ready",
            confidence: 0.92,
            evidence: [
              "BTC latest evidence 1",
              "BTC latest evidence 2",
              "BTC latest evidence 3",
              "BTC latest evidence 4",
            ],
          },
          ETH: {
            status: "watch",
            confidence: 0.58,
            evidence: ["ETH latest evidence 1"],
          },
        },
        inputRefsJson: Prisma.JsonNull,
        degradedAssetsJson: ["ETH"],
        createdAt: new Date("2026-04-11T12:00:00.000Z"),
      },
    });

    await db.job.createMany({
      data: [
        {
          type: "analysis",
          status: "queued",
          payloadJson: { mode: "manual" },
          createdAt: new Date("2026-04-11T11:00:00.000Z"),
        },
        {
          type: "analysis",
          status: "failed",
          payloadJson: { mode: "manual" },
          error: "boom",
          completedAt: new Date("2026-04-11T09:30:00.000Z"),
          createdAt: new Date("2026-04-11T09:00:00.000Z"),
        },
      ],
    });

    await db.replayJob.create({
      data: {
        fromTime: new Date("2026-04-11T00:00:00.000Z"),
        toTime: new Date("2026-04-11T06:00:00.000Z"),
        status: "completed",
        resultJson: { snapshotCount: 1, assetCount: 2 },
        completedAt: new Date("2026-04-11T06:30:00.000Z"),
        createdAt: new Date("2026-04-11T06:00:00.000Z"),
        configVersionId: activeConfig.id,
      },
    });

    const response = await GET();
    const payload = (await response.json()) as {
      marketSummary: {
        strategyVersion: string | null;
        latestRunAt: string | null;
        warnings: string[];
        degradedAssets: string[];
      };
      assets: Array<{
        symbol: string;
        status: string;
        confidence: number | null;
        evidence: string[];
      }>;
      operations: {
        queuedJobCount: number;
        recentFailedJobs: Array<{ id: string }>;
        recentRunCount24h: number;
        recentReplayCount24h: number;
      };
      activeConfig: {
        summary: string | null;
        riskPct: number | null;
        versionId: string | null;
      };
    };

    expect(response.status).toBe(200);
    expect(payload).toHaveProperty("marketSummary");
    expect(payload).toHaveProperty("assets");
    expect(payload).toHaveProperty("operations");
    expect(payload).toHaveProperty("activeConfig");
    expect(payload.marketSummary.strategyVersion).toBe("baseline-v2");
    expect(payload.marketSummary.warnings).toEqual(["watch BTC"]);
    expect(payload.assets).toHaveLength(2);
    expect(payload.operations.queuedJobCount).toBe(1);
    expect(payload.operations.recentFailedJobs).toHaveLength(1);
    expect(payload.activeConfig.summary).toBe("guardrails v12");
    expect(payload.activeConfig.riskPct).toBe(0.7);
    expect(payload.activeConfig.versionId).toBe(activeConfig.id);
  });
});
