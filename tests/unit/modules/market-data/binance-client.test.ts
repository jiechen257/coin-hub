// @vitest-environment node

import { createBinanceClient } from "@/modules/market-data/binance-client";

describe("binance-client", () => {
  it("requests spot candles from binance vision public market data", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify([
          [
            1_776_333_600_000,
            "74594.02",
            "74653.12",
            "74277.34",
            "74313.00",
            "526.53069",
          ],
        ]),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    const client = createBinanceClient(fetchImpl);
    const candles = await client.fetchCandles("BTC", "1h");

    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const [requestedUrl, requestInit] = fetchImpl.mock.calls[0] ?? [];

    expect(String(requestedUrl)).toBe(
      "https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=500",
    );
    expect(requestInit?.cache).toBe("no-store");
    expect(requestInit?.signal).toBeInstanceOf(AbortSignal);
    expect(candles).toEqual([
      {
        openTime: 1_776_333_600_000,
        open: 74594.02,
        high: 74653.12,
        low: 74277.34,
        close: 74313,
        volume: 526.53069,
      },
    ]);
  });
});
