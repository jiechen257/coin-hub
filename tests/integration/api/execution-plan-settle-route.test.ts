// @vitest-environment node

import { POST } from "@/app/api/execution-plans/[planId]/settle/route";
import { db } from "@/lib/db";

async function seedPlan() {
  const trader = await db.traderProfile.create({
    data: { name: "Trader Settle" },
  });

  const record = await db.traderRecord.create({
    data: {
      traderId: trader.id,
      symbol: "BTC",
      timeframe: "1h",
      recordType: "trade",
      sourceType: "manual",
      occurredAt: new Date("2026-04-16T08:00:00.000Z"),
      rawContent: "BTC 68000 开多，69000 平多",
    },
  });

  const plan = await db.executionPlan.create({
    data: {
      recordId: record.id,
      label: "real-trade",
      status: "ready",
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

  await db.candle.createMany({
    data: [
      {
        symbol: "BTC",
        timeframe: "1h",
        openTime: new Date("2026-04-16T08:00:00.000Z"),
        open: 68000,
        high: 68100,
        low: 67900,
        close: 68050,
        volume: 10,
        source: "binance",
      },
      {
        symbol: "BTC",
        timeframe: "1h",
        openTime: new Date("2026-04-16T09:00:00.000Z"),
        open: 68050,
        high: 69100,
        low: 67800,
        close: 69000,
        volume: 12,
        source: "binance",
      },
    ],
  });

  return plan.id;
}

describe("execution plan settle route", () => {
  beforeEach(async () => {
    await db.strategyCandidateSample.deleteMany();
    await db.strategyCandidate.deleteMany();
    await db.tradeSample.deleteMany();
    await db.executionPlan.deleteMany();
    await db.traderRecord.deleteMany();
    await db.traderProfile.deleteMany();
    await db.candle.deleteMany();
  });

  afterEach(async () => {
    await db.strategyCandidateSample.deleteMany();
    await db.strategyCandidate.deleteMany();
    await db.tradeSample.deleteMany();
    await db.executionPlan.deleteMany();
    await db.traderRecord.deleteMany();
    await db.traderProfile.deleteMany();
    await db.candle.deleteMany();
  });

  it("settles one execution plan and updates its status", async () => {
    const planId = await seedPlan();

    const response = await POST(
      new Request(`http://localhost/api/execution-plans/${planId}/settle`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          entryPrice: 68000,
          exitPrice: 69000,
          settledAt: "2026-04-16T10:00:00.000Z",
          notes: "route settlement",
        }),
      }),
      { params: Promise.resolve({ planId }) },
    );

    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      sample: { planId: string; pnlValue: number; resultTag: string };
    };

    expect(payload.sample.planId).toBe(planId);
    expect(payload.sample.pnlValue).toBe(1000);
    expect(payload.sample.resultTag).toBe("win");

    const plan = await db.executionPlan.findUniqueOrThrow({ where: { id: planId } });
    expect(plan.status).toBe("settled");
  });
});
