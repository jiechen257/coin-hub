// @vitest-environment node

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getOverviewPayload } from "@/modules/overview/overview-service";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

describe("overview-service", () => {
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

  it("aggregates the latest overview payload from runs, configs, jobs, and replays", async () => {
    const activeConfig = await db.configVersion.create({
      data: {
        summary: "guardrails v12",
        paramsJson: { riskPct: 0.7 },
        isActive: true,
      },
    });

    await db.runSnapshot.createMany({
      data: [
        {
          mode: "manual",
          strategyVersion: "baseline-v1",
          warningsJson: [],
          assetsJson: {
            BTC: {
              symbol: "BTC",
              evidence: ["BTC evidence A", "BTC evidence B", "BTC evidence C"],
            },
            ETH: {
              symbol: "ETH",
              evidence: ["ETH evidence A", "ETH evidence B"],
            },
          },
          inputRefsJson: Prisma.JsonNull,
          degradedAssetsJson: [],
          createdAt: new Date("2026-04-11T10:00:00.000Z"),
        },
        {
          mode: "manual",
          strategyVersion: "baseline-v2",
          warningsJson: ["watch BTC"],
          assetsJson: {
            BTC: {
              symbol: "BTC",
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
              symbol: "ETH",
              status: "watch",
              confidence: 0.58,
              evidence: [
                "ETH latest evidence 1",
                "ETH latest evidence 2",
                "ETH latest evidence 3",
                "ETH latest evidence 4",
              ],
            },
          },
          inputRefsJson: Prisma.JsonNull,
          degradedAssetsJson: ["ETH"],
          createdAt: new Date("2026-04-11T12:00:00.000Z"),
        },
        {
          mode: "manual",
          strategyVersion: "baseline-v3",
          warningsJson: [],
          assetsJson: {
            BTC: {
              symbol: "BTC",
              evidence: ["older BTC evidence"],
            },
          },
          inputRefsJson: Prisma.JsonNull,
          degradedAssetsJson: [],
          createdAt: new Date("2026-04-10T14:00:00.000Z"),
        },
      ],
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
          status: "processing",
          payloadJson: { mode: "manual" },
          startedAt: new Date("2026-04-11T11:30:00.000Z"),
          createdAt: new Date("2026-04-11T11:15:00.000Z"),
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

    await db.replayJob.createMany({
      data: [
        {
          fromTime: new Date("2026-04-11T00:00:00.000Z"),
          toTime: new Date("2026-04-11T06:00:00.000Z"),
          status: "completed",
          resultJson: { snapshotCount: 1, assetCount: 2 },
          completedAt: new Date("2026-04-11T06:30:00.000Z"),
          createdAt: new Date("2026-04-11T06:00:00.000Z"),
          configVersionId: activeConfig.id,
        },
        {
          fromTime: new Date("2026-04-11T06:00:00.000Z"),
          toTime: new Date("2026-04-11T12:00:00.000Z"),
          status: "completed",
          resultJson: { snapshotCount: 2, assetCount: 4 },
          completedAt: new Date("2026-04-11T12:30:00.000Z"),
          createdAt: new Date("2026-04-11T12:00:00.000Z"),
          configVersionId: activeConfig.id,
        },
      ],
    });

    const payload = await getOverviewPayload();

    expect(payload.marketSummary.strategyVersion).toBe("baseline-v2");
    expect(payload.marketSummary.latestRunAt).toContain("2026-04-11");
    expect(payload.marketSummary.warnings).toEqual(["watch BTC"]);
    expect(payload.marketSummary.degradedAssets).toEqual(["ETH"]);
    expect(payload.assets).toHaveLength(2);
    expect(payload.assets.map((asset) => asset.symbol)).toEqual(["BTC", "ETH"]);
    expect(payload.assets.find((asset) => asset.symbol === "BTC")).toEqual({
      symbol: "BTC",
      status: "ready",
      confidence: 0.92,
      evidence: [
        "BTC latest evidence 1",
        "BTC latest evidence 2",
        "BTC latest evidence 3",
      ],
    });
    expect(payload.assets.find((asset) => asset.symbol === "ETH")).toEqual({
      symbol: "ETH",
      status: "watch",
      confidence: 0.58,
      evidence: [
        "ETH latest evidence 1",
        "ETH latest evidence 2",
        "ETH latest evidence 3",
      ],
    });
    expect(payload.operations.queuedJobCount).toBe(2);
    expect(payload.operations.recentFailedJobs).toHaveLength(1);
    expect(payload.operations.recentRunCount24h).toBe(3);
    expect(payload.operations.recentReplayCount24h).toBe(2);
    expect(payload.activeConfig.summary).toBe("guardrails v12");
    expect(payload.activeConfig.riskPct).toBe(0.7);
    expect(payload.activeConfig.versionId).toBe(activeConfig.id);
  });

  it("returns real operations and config data when no run snapshot exists", async () => {
    const activeConfig = await db.configVersion.create({
      data: {
        summary: "guardrails v12",
        paramsJson: { riskPct: 0.7 },
        isActive: true,
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
          status: "processing",
          payloadJson: { mode: "manual" },
          startedAt: new Date("2026-04-11T11:30:00.000Z"),
          createdAt: new Date("2026-04-11T11:15:00.000Z"),
        },
      ],
    });

    await db.replayJob.createMany({
      data: [
        {
          fromTime: new Date("2026-04-11T00:00:00.000Z"),
          toTime: new Date("2026-04-11T06:00:00.000Z"),
          status: "completed",
          resultJson: { snapshotCount: 0, assetCount: 0 },
          completedAt: new Date("2026-04-11T06:30:00.000Z"),
          createdAt: new Date("2026-04-11T06:00:00.000Z"),
          configVersionId: activeConfig.id,
        },
      ],
    });

    const payload = await getOverviewPayload();

    expect(payload.marketSummary.strategyVersion).toBeNull();
    expect(payload.marketSummary.latestRunAt).toBeNull();
    expect(payload.marketSummary.warnings).toEqual([]);
    expect(payload.marketSummary.degradedAssets).toEqual([]);
    expect(payload.assets).toEqual([]);
    expect(payload.operations.queuedJobCount).toBe(2);
    expect(payload.operations.recentRunCount24h).toBe(0);
    expect(payload.operations.recentReplayCount24h).toBe(1);
    expect(payload.operations.recentFailedJobs).toEqual([]);
    expect(payload.activeConfig.summary).toBe("guardrails v12");
    expect(payload.activeConfig.riskPct).toBe(0.7);
    expect(payload.activeConfig.versionId).toBe(activeConfig.id);
  });

  it("returns a full empty-safe shape when the database is empty", async () => {
    const payload = await getOverviewPayload();

    expect(payload).toEqual({
      marketSummary: {
        strategyVersion: null,
        latestRunAt: null,
        warnings: [],
        degradedAssets: [],
      },
      assets: [],
      operations: {
        queuedJobCount: 0,
        recentFailedJobs: [],
        recentRunCount24h: 0,
        recentReplayCount24h: 0,
      },
      activeConfig: {
        summary: null,
        riskPct: null,
        versionId: null,
      },
    });
  });
});
