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
    vi.mocked(fetchAndStoreCandles).mockResolvedValue({ processedCandles: 0 });
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

  it("returns cached candles without waiting for background refresh", async () => {
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

    const responseTimeoutMs = 100;
    let resolveRefresh: ((value: { processedCandles: number }) => void) | null =
      null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    vi.mocked(fetchAndStoreCandles).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    const response = await Promise.race([
      GET(new Request("http://localhost:3000/api/market/BTC?timeframe=1h"), {
        params: Promise.resolve({ symbol: "BTC" }),
      }),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("cached market response timed out"));
        }, responseTimeoutMs);
      }),
    ]);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    resolveRefresh?.({ processedCandles: 0 });

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.candles).toHaveLength(1);
    expect(payload.warning).toBeNull();
    expect(payload.stale).toBe(false);
  });

  it("returns cached candles when background refresh fails", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

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

    try {
      const response = await GET(
        new Request("http://localhost:3000/api/market/BTC?timeframe=1h"),
        { params: Promise.resolve({ symbol: "BTC" }) },
      );

      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.candles).toHaveLength(1);
      expect(payload.warning).toBeNull();
      expect(payload.stale).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[market] background refresh failed for BTC 1h: connect timeout",
      );
    } finally {
      consoleWarnSpy.mockRestore();
    }
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
