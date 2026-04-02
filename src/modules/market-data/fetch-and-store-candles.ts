import { createBinanceClient } from "@/modules/market-data/binance-client";
import { candleRepository, type CandleRepository } from "@/modules/market-data/candle-repository";
import {
  normalizeCandles,
  type CandleTimeframe,
  type RawCandle,
} from "@/modules/market-data/normalize-candles";

const DEFAULT_SYMBOLS = ["BTC", "ETH"] as const;
const DEFAULT_TIMEFRAMES: CandleTimeframe[] = ["15m", "1h", "4h", "1d"];

export type MarketDataClient = {
  fetchCandles(symbol: string, timeframe: CandleTimeframe): Promise<ReadonlyArray<RawCandle>>;
};

export type FetchAndStoreCandlesDependencies = {
  client?: MarketDataClient;
  repository?: CandleRepository;
  timeframes?: CandleTimeframe[];
};

export async function fetchAndStoreCandles(
  symbols: readonly string[] = DEFAULT_SYMBOLS,
  dependencies: FetchAndStoreCandlesDependencies = {}
) {
  const client: MarketDataClient = dependencies.client ?? createBinanceClient();
  const repository = dependencies.repository ?? candleRepository;
  const timeframes = dependencies.timeframes ?? DEFAULT_TIMEFRAMES;

  let processedCandles = 0;

  for (const symbol of symbols) {
    for (const timeframe of timeframes) {
      const rawCandles = await client.fetchCandles(symbol, timeframe);
      const normalizedCandles = normalizeCandles(rawCandles);

      const result = await repository.storeCandles({
        symbol,
        timeframe,
        candles: normalizedCandles,
        source: "binance",
      });

      processedCandles += result.processedCandles;
    }
  }

  return { processedCandles };
}
