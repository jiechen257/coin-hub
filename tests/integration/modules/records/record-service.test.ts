// @vitest-environment node

import { db } from "@/lib/db";
import { createTraderRecord } from "@/modules/records/record-repository";

describe("record-repository", () => {
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

  it("stores a trader record with its execution plan", async () => {
    const trader = await db.traderProfile.create({
      data: { name: "Trader A", platform: "manual" },
    });

    const record = await createTraderRecord({
      traderId: trader.id,
      symbol: "BTC",
      recordType: "trade",
      sourceType: "manual",
      occurredAt: new Date("2026-04-16T08:00:00.000Z"),
      rawContent: "BTC 多单，68000 开，69000 平",
      plans: [
        {
          label: "real-trade",
          side: "long",
          entryPrice: 68000,
          exitPrice: 69000,
          marketContext: "trend",
          triggerText: "follow breakout",
          entryText: "enter on trader fill",
          riskText: "stop below last swing",
          exitText: "exit on trader close",
        },
      ],
    });

    expect(record.executionPlans).toHaveLength(1);
    expect(record.executionPlans[0]?.label).toBe("real-trade");
  });
});
