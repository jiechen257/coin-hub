// @vitest-environment node

import { db } from "@/lib/db";
import { GET } from "@/app/api/market/[symbol]/route";

describe("market route", () => {
  beforeEach(async () => {
    await db.candle.deleteMany();
  });

  afterEach(async () => {
    await db.candle.deleteMany();
  });

  it("returns candles for one symbol and timeframe", async () => {
    await db.candle.create({
      data: {
        symbol: "BTC",
        timeframe: "1h",
        openTime: new Date("2026-04-16T00:00:00.000Z"),
        open: 68000,
        high: 68100,
        low: 67900,
        close: 68050,
        volume: 10,
        source: "binance",
      },
    });

    const response = await GET(
      new Request("http://localhost:3000/api/market/BTC?timeframe=1h"),
      { params: Promise.resolve({ symbol: "BTC" }) },
    );

    const payload = await response.json();

    expect(payload.symbol).toBe("BTC");
    expect(payload.candles).toHaveLength(1);
  });
});
