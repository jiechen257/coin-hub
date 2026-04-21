// @vitest-environment node

process.env.DATABASE_URL = "file:./prisma/test.db";
process.env.LOCAL_DATABASE_URL = "file:./prisma/test.db";
process.env.TURSO_DATABASE_URL = "";
process.env.TURSO_AUTH_TOKEN = "";

const { GET: getTraderRecordsRoute } = await import("@/app/api/trader-records/route");
const { PATCH: patchTraderRecordRoute } = await import("@/app/api/trader-records/[recordId]/route");
const { POST: postTraderRecordsRoute } = await import("@/app/api/trader-records/route");
const { POST: postTradersRoute } = await import("@/app/api/traders/route");
const { db } = await import("@/lib/db");
const { candleRepository } = await import("@/modules/market-data/candle-repository");
const { createRecordFromInput } = await import("@/modules/records/record-service");
import { ZodError } from "zod";

async function expectInputError(input: unknown, path: string) {
  const error = await createRecordFromInput(input).catch((reason: unknown) => reason);

  expect(error).toBeInstanceOf(ZodError);

  if (error instanceof ZodError) {
    expect(error.issues.some((issue) => issue.path.join(".") === path)).toBe(true);
  }
}

function createJsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createPatchRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createOneHourCandleSeries(args: {
  startAt: string;
  length: number;
  buildCandle?: (index: number) => {
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    volume?: number;
  };
}) {
  const startTimeMs = new Date(args.startAt).getTime();

  return Array.from({ length: args.length }, (_, index) => {
    const overrides = args.buildCandle?.(index) ?? {};

    return {
      openTime: new Date(startTimeMs + index * 60 * 60 * 1_000),
      open: overrides.open ?? 100,
      high: overrides.high ?? 100.5,
      low: overrides.low ?? 99.5,
      close: overrides.close ?? 100.2,
      volume: overrides.volume ?? 1,
    };
  });
}

describe("record-service", () => {
  beforeEach(async () => {
    await db.recordOutcomeReviewTag.deleteMany();
    await db.reviewTag.deleteMany();
    await db.recordOutcome.deleteMany();
    await db.candle.deleteMany();
    await db.executionPlan.deleteMany();
    await db.traderRecord.deleteMany();
    await db.traderProfile.deleteMany();
  });

  afterEach(async () => {
    await db.recordOutcomeReviewTag.deleteMany();
    await db.reviewTag.deleteMany();
    await db.recordOutcome.deleteMany();
    await db.candle.deleteMany();
    await db.executionPlan.deleteMany();
    await db.traderRecord.deleteMany();
    await db.traderProfile.deleteMany();
  });

  it("creates a trade record with an automatic ready plan", async () => {
    const trader = await db.traderProfile.create({ data: { name: "Trader Auto" } });

    const record = await createRecordFromInput({
      traderId: trader.id,
      symbol: "BTC",
      recordType: "trade",
      sourceType: "manual",
      occurredAt: "2026-04-16T08:00:00.000Z",
      rawContent: "68000 开多，69000 平多",
      plans: [],
      trade: {
        side: "long",
        entryPrice: 68000,
        exitPrice: 69000,
        marketContext: "trend",
        triggerText: "follow breakout",
        entryText: "copy trader fill",
        riskText: "stop below 67200",
        exitText: "close with trader",
      },
    });

    expect(record.executionPlans[0]?.status).toBe("ready");

    const outcomes = await db.recordOutcome.findMany({
      where: { recordId: record.id },
    });

    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]?.resultLabel).toBe("pending");
    expect(outcomes[0]?.timeframe).toBe("1h");
  });

  it("keeps zero-priced trade plans in ready status", async () => {
    const trader = await db.traderProfile.create({ data: { name: "Trader Zero" } });

    const record = await createRecordFromInput({
      traderId: trader.id,
      symbol: "BTC",
      recordType: "trade",
      sourceType: "manual",
      occurredAt: "2026-04-16T08:30:00.000Z",
      rawContent: "0 开多，0 平多",
      plans: [],
      trade: {
        side: "long",
        entryPrice: 0,
        exitPrice: 0,
        triggerText: "test trigger",
        entryText: "test entry",
      },
    });

    expect(record.executionPlans[0]?.status).toBe("ready");
  });

  it("creates a view record with multiple draft plans", async () => {
    const trader = await db.traderProfile.create({ data: { name: "Trader View" } });

    const record = await createRecordFromInput({
      traderId: trader.id,
      symbol: "ETH",
      recordType: "view",
      sourceType: "manual",
      occurredAt: "2026-04-16T09:00:00.000Z",
      rawContent: "ETH 回踩仍偏多",
      plans: [
        {
          label: "plan-a",
          side: "long",
          marketContext: "trend",
          triggerText: "retest support",
          entryText: "enter on reclaim",
        },
        {
          label: "plan-b",
          side: "long",
          marketContext: "trend",
          triggerText: "break prior high",
          entryText: "enter on breakout",
        },
      ],
    });

    expect(record.executionPlans).toHaveLength(2);
    expect(record.executionPlans.every((plan) => plan.status === "draft")).toBe(true);

    const outcomes = await db.recordOutcome.findMany({
      where: {
        planId: {
          in: record.executionPlans.map((plan) => plan.id),
        },
      },
    });

    expect(outcomes).toHaveLength(2);
    expect(outcomes.every((outcome) => outcome.resultLabel === "pending")).toBe(true);
  });

  it("persists a computed non-pending outcome when enough candles already exist", async () => {
    const trader = await db.traderProfile.create({ data: { name: "Trader Computed" } });

    await candleRepository.storeCandles({
      symbol: "BTC",
      timeframe: "1h",
      candles: createOneHourCandleSeries({
        startAt: "2026-04-16T08:00:00.000Z",
        length: 24,
        buildCandle: (index) =>
          index === 1
            ? {
                open: 100.2,
                high: 103,
                low: 100,
                close: 102.6,
              }
            : {},
      }),
    });

    const record = await createRecordFromInput({
      traderId: trader.id,
      symbol: "BTC",
      recordType: "trade",
      sourceType: "manual",
      occurredAt: "2026-04-16T08:00:00.000Z",
      rawContent: "现有行情足够计算 outcome",
      plans: [],
      trade: {
        side: "long",
        entryPrice: 68000,
        exitPrice: 69000,
        triggerText: "fresh breakout",
        entryText: "join with follow through",
      },
    });

    const outcomes = await db.recordOutcome.findMany({
      where: { recordId: record.id },
    });

    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]).toMatchObject({
      resultLabel: "good",
      timeframe: "1h",
    });
    expect(outcomes[0]?.resultReason).toContain("顺向");
  });

  it("rejects trade records without the required trade payload", async () => {
    const trader = await db.traderProfile.create({ data: { name: "Trader Missing Trade" } });

    await expectInputError(
      {
        traderId: trader.id,
        symbol: "BTC",
        recordType: "trade",
        sourceType: "manual",
        occurredAt: "2026-04-16T10:00:00.000Z",
        rawContent: "只写了交易结论",
        plans: [],
      },
      "trade",
    );
  });

  it("rejects trade records that try to create execution plans directly", async () => {
    const trader = await db.traderProfile.create({ data: { name: "Trader Trade Plans" } });

    await expectInputError(
      {
        traderId: trader.id,
        symbol: "BTC",
        recordType: "trade",
        sourceType: "manual",
        occurredAt: "2026-04-16T10:30:00.000Z",
        rawContent: "只给 plans",
        plans: [
          {
            label: "plan-a",
            side: "long",
            triggerText: "retest support",
            entryText: "enter on reclaim",
          },
        ],
      },
      "trade",
    );
  });

  it("rejects view records that send trade payloads instead of plans", async () => {
    const trader = await db.traderProfile.create({ data: { name: "Trader View Trade" } });

    await expectInputError(
      {
        traderId: trader.id,
        symbol: "ETH",
        recordType: "view",
        sourceType: "manual",
        occurredAt: "2026-04-16T11:00:00.000Z",
        rawContent: "ETH 偏多",
        trade: {
          side: "long",
          triggerText: "retest support",
          entryText: "enter on reclaim",
        },
      },
      "plans",
    );
  });

  it("returns 400 for invalid /api/traders payloads", async () => {
    const response = await postTradersRoute(
      createJsonRequest("http://localhost/api/traders", {}),
    );

    expect(response.status).toBe(400);

    const payload = (await response.json()) as {
      error: string;
      details: Array<{ path: string; message: string }>;
    };
    expect(payload.error).toBe("Invalid trader payload");
    expect(payload.details[0]?.path).toBe("name");
  });

  it("creates traders through /api/traders", async () => {
    const response = await postTradersRoute(
      createJsonRequest("http://localhost/api/traders", {
        name: "Trader Route",
        platform: "manual",
      }),
    );

    expect(response.status).toBe(201);

    const payload = (await response.json()) as { trader: { name: string; platform: string } };
    expect(payload.trader.name).toBe("Trader Route");
    expect(payload.trader.platform).toBe("manual");
  });

  it("returns 400 for invalid /api/trader-records payloads", async () => {
    const trader = await db.traderProfile.create({ data: { name: "Trader Route Invalid" } });

    const response = await postTraderRecordsRoute(
      createJsonRequest("http://localhost/api/trader-records", {
        traderId: trader.id,
        symbol: "BTC",
        recordType: "trade",
        sourceType: "manual",
        occurredAt: "2026-04-16T12:00:00.000Z",
        rawContent: "invalid trade payload",
        plans: [],
      }),
    );

    expect(response.status).toBe(400);

    const payload = (await response.json()) as {
      error: string;
      details: Array<{ path: string; message: string }>;
    };
    expect(payload.error).toBe("Invalid trader record payload");
    expect(payload.details.some((detail) => detail.path === "trade")).toBe(true);
  });

  it("creates records with an explicit time range through /api/trader-records", async () => {
    const trader = await db.traderProfile.create({ data: { name: "Trader Range" } });

    const response = await postTraderRecordsRoute(
      createJsonRequest("http://localhost/api/trader-records", {
        traderId: trader.id,
        symbol: "BTC",
        recordType: "view",
        sourceType: "manual",
        startedAt: "2026-04-16T12:00:00.000Z",
        endedAt: "2026-04-16T16:00:00.000Z",
        rawContent: "4h 观察区间内等待 1h 下跌走完",
        plans: [
          {
            label: "plan-a",
            side: "short",
            triggerText: "1h 反弹结束后继续下破",
            entryText: "等待 15m 第二笔反弹结束",
          },
        ],
      }),
    );

    expect(response.status).toBe(201);

    const payload = (await response.json()) as {
      record: {
        occurredAt: string;
        startedAt?: string;
        endedAt?: string;
      };
    };
    expect(payload.record.occurredAt).toBe("2026-04-16T12:00:00.000Z");
    expect(payload.record.startedAt).toBe("2026-04-16T12:00:00.000Z");
    expect(payload.record.endedAt).toBe("2026-04-16T16:00:00.000Z");
  });

  it("persists morphology annotations and returns them from create and list routes", async () => {
    const trader = await db.traderProfile.create({ data: { name: "Trader Morphology" } });

    const response = await postTraderRecordsRoute(
      createJsonRequest("http://localhost/api/trader-records", {
        traderId: trader.id,
        symbol: "BTC",
        recordType: "view",
        sourceType: "manual",
        startedAt: "2026-04-19T08:00:00.000Z",
        endedAt: "2026-04-19T16:00:00.000Z",
        rawContent: "4h 上涨观察段仍有结束风险",
        morphology: {
          version: "v1",
          items: [
            {
              kind: "trend",
              label: "4h 上涨观察段",
              timeframe: "4h",
              direction: "up",
              startAt: "2026-04-18T20:00:00.000Z",
              endAt: "2026-04-19T16:00:00.000Z",
            },
            {
              kind: "keyLevel",
              label: "78333",
              timeframe: "4h",
              price: 78333,
            },
          ],
        },
        plans: [
          {
            label: "plan-a",
            side: "short",
            triggerText: "1h 下跌延续",
            entryText: "等 15m 反弹结束",
          },
        ],
      }),
    );

    expect(response.status).toBe(201);

    const payload = (await response.json()) as {
      record: {
        morphology?: {
          version: string;
          items: Array<{ kind: string; label?: string }>;
        } | null;
      };
    };

    expect(payload.record.morphology).toEqual({
      version: "v1",
      items: [
        expect.objectContaining({
          kind: "trend",
          label: "4h 上涨观察段",
        }),
        expect.objectContaining({
          kind: "keyLevel",
          label: "78333",
        }),
      ],
    });

    const listResponse = await getTraderRecordsRoute();
    const listPayload = (await listResponse.json()) as {
      records: Array<{
        morphology?: {
          version: string;
          items: Array<{ kind: string; label?: string }>;
        } | null;
      }>;
    };

    expect(listPayload.records[0]?.morphology?.items).toEqual([
      expect.objectContaining({ kind: "trend", label: "4h 上涨观察段" }),
      expect.objectContaining({ kind: "keyLevel", label: "78333" }),
    ]);
  });

  it("updates a record through /api/trader-records/[recordId]", async () => {
    const trader = await db.traderProfile.create({ data: { name: "Trader Update" } });
    const created = await createRecordFromInput({
      traderId: trader.id,
      symbol: "BTC",
      recordType: "view",
      sourceType: "manual",
      occurredAt: "2026-04-16T13:00:00.000Z",
      rawContent: "原始观点",
      plans: [
        {
          label: "plan-a",
          side: "long",
          triggerText: "原始触发",
          entryText: "原始入场",
        },
      ],
    });

    const response = await patchTraderRecordRoute(
      createPatchRequest(`http://localhost/api/trader-records/${created.id}`, {
        traderId: trader.id,
        symbol: "ETH",
        recordType: "view",
        sourceType: "manual",
        occurredAt: "2026-04-16T13:30:00.000Z",
        rawContent: "更新后的观点",
        plans: [
          {
            id: created.executionPlans[0]?.id,
            label: "plan-a",
            side: "short",
            triggerText: "更新触发",
            entryText: "更新入场",
          },
        ],
      }),
      { params: Promise.resolve({ recordId: created.id }) },
    );

    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      record: {
        symbol: string;
        rawContent: string;
        executionPlans: Array<{ side: string; triggerText: string }>;
      };
    };
    expect(payload.record.symbol).toBe("ETH");
    expect(payload.record.rawContent).toBe("更新后的观点");
    expect(payload.record.executionPlans[0]).toMatchObject({
      side: "short",
      triggerText: "更新触发",
    });
  });

  it("archives records through /api/trader-records/[recordId] and hides them from listing", async () => {
    const trader = await db.traderProfile.create({ data: { name: "Trader Archive" } });
    const created = await createRecordFromInput({
      traderId: trader.id,
      symbol: "BTC",
      recordType: "view",
      sourceType: "manual",
      occurredAt: "2026-04-16T14:00:00.000Z",
      rawContent: "要被存档的记录",
      plans: [
        {
          label: "plan-a",
          side: "long",
          triggerText: "触发",
          entryText: "入场",
        },
      ],
    });

    const archiveResponse = await patchTraderRecordRoute(
      createPatchRequest(`http://localhost/api/trader-records/${created.id}`, {
        action: "archive",
      }),
      { params: Promise.resolve({ recordId: created.id }) },
    );

    expect(archiveResponse.status).toBe(200);

    const listResponse = await getTraderRecordsRoute();
    const listPayload = (await listResponse.json()) as {
      records: Array<{ id: string }>;
    };

    expect(listPayload.records.some((record) => record.id === created.id)).toBe(false);
  });
});
