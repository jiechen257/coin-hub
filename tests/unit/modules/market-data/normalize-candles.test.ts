// @vitest-environment node

import { normalizeCandles } from "@/modules/market-data/normalize-candles";

describe("normalize-candles", () => {
  it("sorts candles and rejects duplicate open times", () => {
    expect(() =>
      normalizeCandles([
        { openTime: 2, open: 1, high: 2, low: 1, close: 2 },
        { openTime: 2, open: 1, high: 2, low: 1, close: 2 },
      ])
    ).toThrow("duplicate candle openTime");
  });

  it("rejects invalid open times", () => {
    expect(() =>
      normalizeCandles([{ openTime: Number.NaN, open: 1, high: 2, low: 1, close: 2 }])
    ).toThrow("invalid candle openTime");

    expect(() =>
      normalizeCandles([{ openTime: new Date(Number.NaN), open: 1, high: 2, low: 1, close: 2 }])
    ).toThrow("invalid candle openTime");
  });

  it("rejects invalid OHLCV values", () => {
    expect(() =>
      normalizeCandles([{ openTime: 1, open: Number.NaN, high: 2, low: 1, close: 2 }])
    ).toThrow("invalid candle open");

    expect(() =>
      normalizeCandles([{ openTime: 1, open: 1, high: 2, low: 1, close: 2, volume: Number.POSITIVE_INFINITY }])
    ).toThrow("invalid candle volume");
  });
});
