// @vitest-environment node

import { createBinanceFuturesClient } from "@/modules/market-data/binance-futures-client";

describe("binance-futures-client", () => {
  it("calls the Binance USDⓈ-M futures kline endpoint and trims the newest candle", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
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

    const client = createBinanceFuturesClient(fetchMock as typeof fetch);
    const candles = await client.fetchCandles("BTC", "15m");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBeInstanceOf(URL);
    expect(fetchMock.mock.calls[0][0].toString()).toBe(
      "https://fapi.binance.com/fapi/v1/klines?symbol=BTCUSDT&interval=15m&limit=500"
    );
    expect(candles).toEqual([
      {
        openTime: 1_000,
        open: 1,
        high: 2,
        low: 0.5,
        close: 1.5,
        volume: 10,
      },
    ]);
  });

  it("throws when Binance returns a non-2xx response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("bad gateway", { status: 502 }));
    const client = createBinanceFuturesClient(fetchMock as typeof fetch);

    await expect(client.fetchCandles("ETH", "1h")).rejects.toThrow(/failed to fetch Binance futures candles for ETH 1h/);
  });
});
