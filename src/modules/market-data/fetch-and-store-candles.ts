import { createBinanceFuturesClient } from "@/modules/market-data/binance-futures-client";
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

/**
 * 按资产与周期批量抓取 Binance Futures K 线，并通过统一仓储做幂等写库。
 */
export async function fetchAndStoreCandles(
  symbols: readonly string[] = DEFAULT_SYMBOLS,
  dependencies: FetchAndStoreCandlesDependencies = {}
) {
  // 默认切换到 Binance USDⓈ-M 合约行情客户端，确保采集入口直接走真实 futures 数据源。
  const client: MarketDataClient = dependencies.client ?? createBinanceFuturesClient();
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
        // 明确标记为合约行情来源，便于后续分析和排查。
        source: "binance-futures",
      });

      processedCandles += result.processedCandles;
    }
  }

  return { processedCandles };
}
