// @vitest-environment node

import { db } from "@/lib/db";
import { GET } from "@/app/api/analysis/[symbol]/route";

describe("analysis api", () => {
  beforeEach(async () => {
    await db.candle.deleteMany();
  });

  afterEach(async () => {
    await db.candle.deleteMany();
  });

  it("returns real candles from the Candle table for the selected asset", async () => {
    const now = Date.now();

    await db.candle.create({
      data: {
        symbol: "BTC",
        timeframe: "1h",
        openTime: new Date(now - 90 * 60_000),
        open: 100,
        high: 110,
        low: 95,
        close: 108,
        volume: 12,
        source: "binance-futures",
      },
    });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ symbol: "BTC" }),
    } as never);
    const data = await response.json();

    expect(data.chart.candles).toHaveLength(1);
    expect(data.chart.candles[0].close).toBe(108);
    expect(data.chart.structureMarkers.length).toBeGreaterThan(0);
    expect(data.viewpoints.length).toBeGreaterThan(0);
    expect(data.signal.symbol).toBe("BTC");
    expect(data.warnings).toEqual([]);
  });
});
