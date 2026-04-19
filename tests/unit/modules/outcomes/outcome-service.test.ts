import { syncRecordOutcomes } from "@/modules/outcomes/outcome-service";

function createCandleSeries(args: {
  startAt: string;
  timeframeHours?: number;
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
  const timeframeMs = (args.timeframeHours ?? 1) * 60 * 60 * 1_000;

  return Array.from({ length: args.length }, (_, index) => {
    const overrides = args.buildCandle?.(index) ?? {};

    return {
      openTime: new Date(startTimeMs + timeframeMs * index),
      open: overrides.open ?? 100,
      high: overrides.high ?? 100.5,
      low: overrides.low ?? 99.5,
      close: overrides.close ?? 100.2,
      volume: overrides.volume ?? 1,
    };
  });
}

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

  it("returns pending when the nearest candle is outside the safe alignment distance", async () => {
    const result = await syncRecordOutcomes({
      record: {
        id: "record-gap",
        recordType: "trade",
        symbol: "BTC",
        occurredAt: new Date("2026-04-19T00:00:00.000Z"),
        executionPlans: [
          {
            id: "plan-gap",
            side: "long",
            triggerText: "gap breakout",
            entryText: "follow late candle",
          },
        ],
      },
      timeframe: "1h",
      candles: createCandleSeries({
        startAt: "2026-04-20T00:00:00.000Z",
        length: 24,
        buildCandle: (index) =>
          index === 0
            ? {
                open: 100,
                high: 106,
                low: 99,
                close: 105,
              }
            : {},
      }),
    });

    expect(result[0]).toMatchObject({
      resultLabel: "pending",
      forwardReturnPercent: null,
      maxFavorableExcursionPercent: null,
      maxAdverseExcursionPercent: null,
      resultReason: expect.stringContaining("待定"),
    });
  });

  it("uses record-type profiles to classify the same move differently", async () => {
    const candles = createCandleSeries({
      startAt: "2026-04-19T00:00:00.000Z",
      length: 24,
      buildCandle: (index) =>
        index === 0
          ? {
              open: 100,
              high: 102.1,
              low: 99.2,
              close: 100.5,
            }
          : {},
    });

    const tradeResult = await syncRecordOutcomes({
      record: {
        id: "record-trade-profile",
        recordType: "trade",
        symbol: "BTC",
        occurredAt: new Date("2026-04-19T00:00:00.000Z"),
        executionPlans: [
          {
            id: "plan-trade-profile",
            side: "long",
            triggerText: "trade threshold",
            entryText: "trade threshold",
          },
        ],
      },
      timeframe: "1h",
      candles,
    });

    const viewResult = await syncRecordOutcomes({
      record: {
        id: "record-view-profile",
        recordType: "view",
        symbol: "BTC",
        occurredAt: new Date("2026-04-19T00:00:00.000Z"),
        executionPlans: [
          {
            id: "plan-view-profile",
            side: "long",
            triggerText: "view threshold",
            entryText: "view threshold",
          },
        ],
      },
      timeframe: "1h",
      candles,
    });

    expect(tradeResult[0]?.resultLabel).toBe("neutral");
    expect(viewResult[0]?.resultLabel).toBe("good");
  });

  it("uses timeframe profiles to expand the observation window", async () => {
    const oneHourResult = await syncRecordOutcomes({
      record: {
        id: "record-1h-window",
        recordType: "trade",
        symbol: "BTC",
        occurredAt: new Date("2026-04-19T00:00:00.000Z"),
        executionPlans: [
          {
            id: "plan-1h-window",
            side: "long",
            triggerText: "window",
            entryText: "window",
          },
        ],
      },
      timeframe: "1h",
      candles: [],
    });

    const fourHourResult = await syncRecordOutcomes({
      record: {
        id: "record-4h-window",
        recordType: "trade",
        symbol: "BTC",
        occurredAt: new Date("2026-04-19T00:00:00.000Z"),
        executionPlans: [
          {
            id: "plan-4h-window",
            side: "long",
            triggerText: "window",
            entryText: "window",
          },
        ],
      },
      timeframe: "4h",
      candles: [],
    });

    expect(oneHourResult[0]?.windowEndAt.toISOString()).toBe("2026-04-20T00:00:00.000Z");
    expect(fourHourResult[0]?.windowEndAt.toISOString()).toBe("2026-04-22T00:00:00.000Z");
  });

  it("returns pending when a key candle inside the observation window is missing", async () => {
    const candles = createCandleSeries({
      startAt: "2026-04-19T00:00:00.000Z",
      length: 25,
      buildCandle: (index) =>
        index === 0
          ? {
              open: 100,
              high: 101,
              low: 99.5,
              close: 100.6,
            }
          : index === 3
            ? {
                open: 100.6,
                high: 104,
                low: 100.4,
                close: 103.4,
              }
            : {},
    }).filter((candle) => candle.openTime.toISOString() !== "2026-04-19T02:00:00.000Z");

    const result = await syncRecordOutcomes({
      record: {
        id: "record-window-gap",
        recordType: "trade",
        symbol: "BTC",
        occurredAt: new Date("2026-04-19T00:00:00.000Z"),
        executionPlans: [
          {
            id: "plan-window-gap",
            side: "long",
            triggerText: "window gap",
            entryText: "window gap",
          },
        ],
      },
      timeframe: "1h",
      candles,
    });

    expect(result[0]).toMatchObject({
      resultLabel: "pending",
      forwardReturnPercent: null,
      maxFavorableExcursionPercent: null,
      maxAdverseExcursionPercent: null,
    });
  });
});
