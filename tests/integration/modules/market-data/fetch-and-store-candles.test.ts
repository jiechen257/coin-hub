// @vitest-environment node

import { db } from "@/lib/db";
import { createBinanceFuturesClient } from "@/modules/market-data/binance-futures-client";
import { fetchAndStoreCandles } from "@/modules/market-data/fetch-and-store-candles";

describe("fetch-and-store-candles", () => {
  beforeEach(async () => {
    await db.candle.deleteMany();
  });

  afterEach(async () => {
    await db.candle.deleteMany();
  });

  it("stores closed 15m futures candles and keeps repeated ingestion idempotent", async () => {
    const fetchMock = vi.fn().mockImplementation(() => {
      return Promise.resolve(
        new Response(
          JSON.stringify([
            [1_000, "1", "2", "0.5", "1.5", "10"],
            [2_000, "2", "3", "1", "2.5", "11"],
          ]),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          }
        )
      );
    });

    const client = createBinanceFuturesClient(fetchMock as typeof fetch);

    const firstIngestion = await fetchAndStoreCandles(["BTC"], {
      client,
      timeframes: ["15m"],
    });
    const secondIngestion = await fetchAndStoreCandles(["BTC"], {
      client,
      timeframes: ["15m"],
    });

    const btc15m = await db.candle.findMany({
      where: { symbol: "BTC", timeframe: "15m" },
      orderBy: { openTime: "asc" },
    });

    expect(firstIngestion.processedCandles).toBe(1);
    expect(secondIngestion.processedCandles).toBe(1);
    expect(await db.candle.count()).toBe(1);
    expect(btc15m.map((c) => c.openTime.getTime())).toEqual([1_000]);
    expect(btc15m[0].source).toBe("binance-futures");
  });
});
