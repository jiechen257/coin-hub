// @vitest-environment node

import { db } from "@/lib/db";
import { createRecordFromInput } from "@/modules/records/record-service";

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
});
