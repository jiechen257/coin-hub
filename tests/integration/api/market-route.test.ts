// @vitest-environment node

import { db } from "@/lib/db";
import { vi } from "vitest";
import { fetchAndStoreCandles } from "@/modules/market-data/fetch-and-store-candles";
import { GET } from "@/app/api/market/[symbol]/route";

vi.mock("@/modules/market-data/fetch-and-store-candles", () => ({
  fetchAndStoreCandles: vi.fn(),
}));

describe("market route", () => {
  beforeEach(async () => {
    await db.candle.deleteMany();
  });

  afterEach(async () => {
    await db.candle.deleteMany();
    vi.clearAllMocks();
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

  it("returns the newest 500 candles in ascending order", async () => {
    const firstOpenTime = Date.parse("2026-04-16T00:00:00.000Z");

    await db.candle.createMany({
      data: Array.from({ length: 510 }, (_, index) => ({
        symbol: "BTC",
        timeframe: "1h",
        openTime: new Date(firstOpenTime + index * 60 * 60 * 1000),
        open: 68000 + index,
        high: 68100 + index,
        low: 67900 + index,
        close: 68050 + index,
        volume: 10 + index,
        source: "binance",
      })),
    });

    const response = await GET(
      new Request("http://localhost:3000/api/market/BTC?timeframe=1h"),
      { params: Promise.resolve({ symbol: "BTC" }) },
    );

    const payload = await response.json();

    expect(payload.candles).toHaveLength(500);
    expect(payload.candles[0]?.openTime).toBe(new Date(firstOpenTime + 10 * 60 * 60 * 1000).toISOString());
    expect(payload.candles[499]?.openTime).toBe(new Date(firstOpenTime + 509 * 60 * 60 * 1000).toISOString());
  });

  it("fetches candles on cache miss and falls back invalid timeframe to 1h", async () => {
    vi.mocked(fetchAndStoreCandles).mockImplementation(async (symbols, dependencies) => {
      await db.candle.create({
        data: {
          symbol: symbols[0] ?? "BTC",
          timeframe: dependencies?.timeframes?.[0] ?? "1h",
          openTime: new Date("2026-04-16T00:00:00.000Z"),
          open: 68000,
          high: 68100,
          low: 67900,
          close: 68050,
          volume: 10,
          source: "binance",
        },
      });

      return { processedCandles: 1 };
    });

    const response = await GET(
      new Request("http://localhost:3000/api/market/BTC?timeframe=bogus"),
      { params: Promise.resolve({ symbol: "BTC" }) },
    );

    const payload = await response.json();

    expect(payload.symbol).toBe("BTC");
    expect(payload.timeframe).toBe("1h");
    expect(payload.candles).toHaveLength(1);
    expect(vi.mocked(fetchAndStoreCandles)).toHaveBeenCalledWith(["BTC"], { timeframes: ["1h"] });
  });

  it("returns cached candles with warning when refresh fails", async () => {
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

    vi.mocked(fetchAndStoreCandles).mockRejectedValue(new Error("connect timeout"));

    const response = await GET(
      new Request("http://localhost:3000/api/market/BTC?timeframe=1h"),
      { params: Promise.resolve({ symbol: "BTC" }) },
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.candles).toHaveLength(1);
    expect(payload.warning).toBe("Binance 行情拉取超时，当前展示本地缓存。");
    expect(payload.stale).toBe(true);
  });

  it("returns empty candles with warning when refresh fails on cold start", async () => {
    vi.mocked(fetchAndStoreCandles).mockRejectedValue(new Error("connect timeout"));

    const response = await GET(
      new Request("http://localhost:3000/api/market/BTC?timeframe=1h"),
      { params: Promise.resolve({ symbol: "BTC" }) },
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.candles).toHaveLength(0);
    expect(payload.warning).toBe("Binance 行情暂时不可用，本地也没有缓存。");
    expect(payload.stale).toBe(true);
  });
});
