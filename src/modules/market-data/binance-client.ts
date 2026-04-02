import type { CandleTimeframe, RawCandle } from "@/modules/market-data/normalize-candles";

type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

export type BinanceClient = {
  fetchCandles(symbol: string, timeframe: CandleTimeframe): Promise<RawCandle[]>;
};

const BINANCE_BASE_URL = "https://api.binance.com/api/v3/klines";

function toBinanceSymbol(symbol: string) {
  return symbol.endsWith("USDT") ? symbol : `${symbol}USDT`;
}

function parseFiniteNumber(value: string | number, field: string) {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`invalid Binance candle ${field}`);
  }

  return parsed;
}

export function createBinanceClient(fetchImpl: typeof fetch = fetch): BinanceClient {
  return {
    async fetchCandles(symbol, timeframe) {
      const url = new URL(BINANCE_BASE_URL);
      url.searchParams.set("symbol", toBinanceSymbol(symbol));
      url.searchParams.set("interval", timeframe);
      url.searchParams.set("limit", "500");

      const response = await fetchImpl(url);

      if (!response.ok) {
        throw new Error(`failed to fetch Binance candles for ${symbol} ${timeframe}`);
      }

      const payload = (await response.json()) as BinanceKline[];

      // Binance returns array tuples; convert them into typed candles for the rest of the pipeline.
      return payload.map(([openTime, open, high, low, close, volume]) => ({
        openTime: parseFiniteNumber(openTime, "openTime"),
        open: parseFiniteNumber(open, "open"),
        high: parseFiniteNumber(high, "high"),
        low: parseFiniteNumber(low, "low"),
        close: parseFiniteNumber(close, "close"),
        volume: parseFiniteNumber(volume, "volume"),
      }));
    },
  };
}
