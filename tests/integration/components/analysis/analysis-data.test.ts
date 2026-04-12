// @vitest-environment node

import { db } from "@/lib/db";
import { loadAnalysisPayload } from "@/components/analysis/analysis-data";

describe("analysis-data", () => {
  beforeEach(async () => {
    await db.candle.deleteMany();
  });

  afterEach(async () => {
    await db.candle.deleteMany();
  });

  it("从 Candle 表读取真实数据并保留分析结构", async () => {
    const now = Date.now();

    await db.candle.createMany({
      data: [
        {
          symbol: "BTC",
          timeframe: "1h",
          openTime: new Date(now - 3 * 60 * 60_000),
          open: 100,
          high: 104,
          low: 99,
          close: 102,
          volume: 10,
          source: "binance-futures",
        },
        {
          symbol: "BTC",
          timeframe: "1h",
          openTime: new Date(now - 2 * 60 * 60_000),
          open: 102,
          high: 106,
          low: 101,
          close: 105,
          volume: 11,
          source: "binance-futures",
        },
        {
          symbol: "BTC",
          timeframe: "1h",
          openTime: new Date(now - 60 * 60_000),
          open: 105,
          high: 108,
          low: 104,
          close: 107,
          volume: 12,
          source: "binance-futures",
        },
      ],
    });

    const payload = await loadAnalysisPayload({ symbol: "BTC", timeframe: "1h" });

    expect(payload.chart.candles).toHaveLength(3);
    expect(payload.chart.candles[0].close).toBe(102);
    expect(payload.chart.candles[2].close).toBe(107);
    expect(payload.chart.structureMarkers.length).toBeGreaterThan(0);
    expect(payload.viewpoints.length).toBeGreaterThan(0);
    expect(payload.signal.symbol).toBe("BTC");
    expect(payload.warnings).toEqual([]);
  });

  it("在没有同步到市场数据时返回空 candles 和明确提示", async () => {
    const payload = await loadAnalysisPayload({ symbol: "ETH", timeframe: "15m" });

    expect(payload.chart.candles).toEqual([]);
    expect(payload.warnings).toContain("尚未同步市场数据。");
    expect(payload.viewpoints.length).toBeGreaterThan(0);
  });

  it("在最新 candle 超过 freshness 阈值时提示市场数据可能已滞后", async () => {
    const now = Date.now();

    await db.candle.createMany({
      data: [
        {
          symbol: "ETH",
          timeframe: "4h",
          openTime: new Date(now - 18 * 60 * 60_000),
          open: 200,
          high: 205,
          low: 198,
          close: 202,
          volume: 18,
          source: "binance-futures",
        },
        {
          symbol: "ETH",
          timeframe: "4h",
          openTime: new Date(now - 14 * 60 * 60_000),
          open: 202,
          high: 206,
          low: 201,
          close: 204,
          volume: 19,
          source: "binance-futures",
        },
      ],
    });

    const payload = await loadAnalysisPayload({ symbol: "ETH", timeframe: "4h" });

    expect(payload.chart.candles).toHaveLength(2);
    expect(payload.warnings).toContain("市场数据可能已滞后。");
  });
});
