import { db } from "@/lib/db";
import type { CandleTimeframe, NormalizedCandle } from "@/modules/market-data/normalize-candles";

export type StoreCandlesResult = {
  processedCandles: number;
};

export type ListCandlesInput = {
  symbol: string;
  timeframe: CandleTimeframe;
  limit?: number;
};

export type CandleRepository = {
  storeCandles(input: {
    symbol: string;
    timeframe: CandleTimeframe;
    candles: ReadonlyArray<NormalizedCandle>;
    source?: string;
  }): Promise<StoreCandlesResult>;
  listCandles(input: ListCandlesInput): ReturnType<typeof listCandles>;
};

const DEFAULT_CANDLE_LIMIT = 500;

export async function listCandles(input: ListCandlesInput) {
  const candles = await db.candle.findMany({
    where: {
      symbol: input.symbol,
      timeframe: input.timeframe,
    },
    orderBy: {
      openTime: "desc",
    },
    take: input.limit ?? DEFAULT_CANDLE_LIMIT,
  });

  return candles.reverse();
}

export async function storeCandles(input: {
  symbol: string;
  timeframe: CandleTimeframe;
  candles: ReadonlyArray<NormalizedCandle>;
  source?: string;
}) {
  const source = input.source ?? "binance";

  if (input.candles.length === 0) {
    return { processedCandles: 0 };
  }

  await db.$transaction(async (tx) => {
    for (const candle of input.candles) {
      await tx.candle.upsert({
        where: {
          symbol_timeframe_openTime: {
            symbol: input.symbol,
            timeframe: input.timeframe,
            openTime: candle.openTime,
          },
        },
        create: {
          symbol: input.symbol,
          timeframe: input.timeframe,
          openTime: candle.openTime,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
          source,
        },
        update: {
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
          source,
        },
      });
    }
  });

  return {
    // Upsert can update existing rows, so expose processed count instead of implying inserts.
    processedCandles: input.candles.length,
  };
}

export const candleRepository: CandleRepository = {
  storeCandles,
  listCandles,
};
