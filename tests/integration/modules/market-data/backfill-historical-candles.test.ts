// @vitest-environment node

import { strToU8, zipSync } from "fflate";
import { db } from "@/lib/db";
import { backfillHistoricalCandles } from "@/modules/market-data/backfill-historical-candles";

function buildArchive(csv: string) {
  return zipSync({
    "BTCUSDT-1h-2024-02.csv": strToU8(csv),
  }).buffer;
}

describe("backfill-historical-candles", () => {
  beforeEach(async () => {
    await db.candle.deleteMany();
  });

  afterEach(async () => {
    await db.candle.deleteMany();
  });

  it("stores historical candles idempotently and marks the public-data source", async () => {
    const archiveBuffer = buildArchive(
      [
        "1706745600000,43000,43200,42800,43100,120.5,1706749199999,0,0,0,0,0",
        "1706749200000,43100,43500,43000,43450,98.2,1706752799999,0,0,0,0,0",
      ].join("\n")
    );
    const archiveClient = {
      fetchArchive: vi.fn().mockResolvedValue(archiveBuffer),
    };
    const plan = [
      {
        symbol: "BTC",
        marketSymbol: "BTCUSDT",
        timeframe: "1h" as const,
        period: "monthly" as const,
        dateKey: "2024-02",
        path: "/data/futures/um/monthly/klines/BTCUSDT/1h/BTCUSDT-1h-2024-02.zip",
      },
    ];

    const firstRun = await backfillHistoricalCandles({ archiveClient, plan });
    const secondRun = await backfillHistoricalCandles({ archiveClient, plan });
    const stored = await db.candle.findMany({
      where: { symbol: "BTC", timeframe: "1h" },
      orderBy: { openTime: "asc" },
    });

    expect(firstRun.processedCandles).toBe(2);
    expect(firstRun.downloadedArchives).toBe(1);
    expect(firstRun.skippedArchives).toBe(0);
    expect(secondRun.processedCandles).toBe(2);
    expect(await db.candle.count()).toBe(2);
    expect(stored[0].source).toBe("binance-public-data");
    expect(stored.map((item) => item.openTime.getTime())).toEqual([
      1_706_745_600_000,
      1_706_749_200_000,
    ]);
  });
});
