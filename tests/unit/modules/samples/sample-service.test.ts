// @vitest-environment node

import { db } from "@/lib/db";
import { settleExecutionPlan } from "@/modules/samples/sample-service";

async function createPlan(planId: string) {
  const trader = await db.traderProfile.create({
    data: { name: `Trader ${planId}` },
  });

  const record = await db.traderRecord.create({
    data: {
      traderId: trader.id,
      symbol: "BTC",
      recordType: "view",
      sourceType: "manual",
      occurredAt: new Date("2026-04-16T08:00:00.000Z"),
      rawContent: "BTC breakout plan",
    },
  });

  return db.executionPlan.create({
    data: {
      id: planId,
      recordId: record.id,
      label: "breakout-plan",
      status: "ready",
      side: "long",
      marketContext: "trend",
      triggerText: "follow breakout",
      entryText: "enter on reclaim",
      riskText: "stop below swing",
      exitText: "exit at prior high",
    },
  });
}

describe("sample-service", () => {
  beforeEach(async () => {
    await db.strategyCandidateSample.deleteMany();
    await db.strategyCandidate.deleteMany();
    await db.tradeSample.deleteMany();
    await db.executionPlan.deleteMany();
    await db.traderRecord.deleteMany();
    await db.traderProfile.deleteMany();
  });

  afterEach(async () => {
    await db.strategyCandidateSample.deleteMany();
    await db.strategyCandidate.deleteMany();
    await db.tradeSample.deleteMany();
    await db.executionPlan.deleteMany();
    await db.traderRecord.deleteMany();
    await db.traderProfile.deleteMany();
  });

  it("settles a long plan and computes pnl metrics", async () => {
    await createPlan("plan-1");

    const sample = await settleExecutionPlan({
      planId: "plan-1",
      entryPrice: 68000,
      exitPrice: 69000,
      settledAt: "2026-04-16T10:00:00.000Z",
      candleSeries: [
        {
          openTime: new Date("2026-04-16T08:00:00.000Z"),
          low: 67900,
          high: 68100,
          open: 68000,
          close: 68050,
        },
        {
          openTime: new Date("2026-04-16T09:00:00.000Z"),
          low: 67800,
          high: 69100,
          open: 68050,
          close: 69000,
        },
      ],
      side: "long",
    });

    expect(sample.pnlValue).toBe(1000);
    expect(sample.pnlPercent).toBeCloseTo(1.4705, 4);
    expect(sample.holdingMinutes).toBe(120);
    expect(sample.maxDrawdownPercent).toBeCloseTo(-0.2941, 4);
  });
});
