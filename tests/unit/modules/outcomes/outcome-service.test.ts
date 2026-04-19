import { syncRecordOutcomes } from "@/modules/outcomes/outcome-service";

describe("outcome-service", () => {
  it("marks a long trade record as good when favorable excursion wins first", async () => {
    const result = await syncRecordOutcomes({
      record: {
        id: "record-1",
        recordType: "trade",
        symbol: "BTC",
        occurredAt: new Date("2026-04-19T00:00:00.000Z"),
        executionPlans: [
          {
            id: "plan-1",
            side: "long",
            triggerText: "breakout",
            entryText: "follow through",
          },
        ],
      },
      timeframe: "1h",
      candles: [
        {
          openTime: new Date("2026-04-19T00:00:00.000Z"),
          open: 100,
          high: 103,
          low: 99,
          close: 102,
          volume: 1,
        },
        {
          openTime: new Date("2026-04-19T01:00:00.000Z"),
          open: 102,
          high: 107,
          low: 101,
          close: 106,
          volume: 1,
        },
      ],
    });

    expect(result[0]).toMatchObject({
      resultLabel: "good",
      resultReason: expect.stringContaining("顺向"),
    });
  });

  it("returns pending when the candle window is incomplete", async () => {
    const result = await syncRecordOutcomes({
      record: {
        id: "record-2",
        recordType: "trade",
        symbol: "BTC",
        occurredAt: new Date("2026-04-19T00:00:00.000Z"),
        executionPlans: [
          {
            id: "plan-2",
            side: "short",
            triggerText: "reversal",
            entryText: "fade",
          },
        ],
      },
      timeframe: "4h",
      candles: [],
    });

    expect(result[0]?.resultLabel).toBe("pending");
  });

  it("creates one outcome per view plan", async () => {
    const result = await syncRecordOutcomes({
      record: {
        id: "record-3",
        recordType: "view",
        symbol: "ETH",
        occurredAt: new Date("2026-04-19T00:00:00.000Z"),
        executionPlans: [
          {
            id: "plan-a",
            side: "long",
            triggerText: "breakout",
            entryText: "follow",
          },
          {
            id: "plan-b",
            side: "short",
            triggerText: "failed breakout",
            entryText: "fade",
          },
        ],
      },
      timeframe: "1h",
      candles: [],
    });

    expect(result).toHaveLength(2);
  });
});
