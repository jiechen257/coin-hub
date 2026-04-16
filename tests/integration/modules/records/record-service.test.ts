// @vitest-environment node

import { POST as postTraderRecordsRoute } from "@/app/api/trader-records/route";
import { POST as postTradersRoute } from "@/app/api/traders/route";
import { db } from "@/lib/db";
import { createRecordFromInput } from "@/modules/records/record-service";
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

describe("record-service", () => {
  beforeEach(async () => {
    await db.executionPlan.deleteMany();
    await db.traderRecord.deleteMany();
    await db.traderProfile.deleteMany();
  });

  afterEach(async () => {
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
});
