// @vitest-environment node

import { db } from "@/lib/db";
import { fetchAndStoreCandles } from "@/modules/market-data/fetch-and-store-candles";

describe("fetch-and-store-candles", () => {
  beforeEach(async () => {
    await db.candle.deleteMany();
  });

  afterEach(async () => {
    await db.candle.deleteMany();
  });

  it("stores normalized candles for BTC and ETH across all supported timeframes", async () => {
    const candlesBySymbolAndTimeframe = {
      BTC: {
        "15m": [
          { openTime: 2000, open: 2, high: 4, low: 1, close: 3, volume: 10 },
          { openTime: 1000, open: 1, high: 2, low: 0.5, close: 1.5, volume: 5 },
        ],
        "1h": [{ openTime: 1000, open: 10, high: 12, low: 9, close: 11, volume: 20 }],
        "4h": [{ openTime: 1000, open: 20, high: 22, low: 18, close: 21, volume: 30 }],
        "1d": [{ openTime: 1000, open: 30, high: 35, low: 25, close: 32, volume: 40 }],
      },
      ETH: {
        "15m": [{ openTime: 1000, open: 3, high: 4, low: 2, close: 3.5, volume: 7 }],
        "1h": [{ openTime: 1000, open: 11, high: 13, low: 10, close: 12, volume: 8 }],
        "4h": [{ openTime: 1000, open: 21, high: 23, low: 19, close: 22, volume: 9 }],
        "1d": [{ openTime: 1000, open: 31, high: 36, low: 26, close: 33, volume: 10 }],
      },
    } as const;

    const client = {
      fetchCandles: async (symbol: "BTC" | "ETH", timeframe: "15m" | "1h" | "4h" | "1d") =>
        candlesBySymbolAndTimeframe[symbol][timeframe],
    };

    const firstIngestion = await fetchAndStoreCandles(["BTC", "ETH"], { client });
    const secondIngestion = await fetchAndStoreCandles(["BTC", "ETH"], { client });

    const btc15m = await db.candle.findMany({
      where: { symbol: "BTC", timeframe: "15m" },
      orderBy: { openTime: "asc" },
    });

    expect(firstIngestion.processedCandles).toBe(9);
    expect(secondIngestion.processedCandles).toBe(9);
    expect(await db.candle.count()).toBe(9);
    expect(btc15m.map((c) => c.openTime.getTime())).toEqual([1000, 2000]);
    expect(btc15m[0].source).toBe("binance");
  });
});
