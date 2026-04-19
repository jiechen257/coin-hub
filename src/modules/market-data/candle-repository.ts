import { db } from "@/lib/db";
import type { CandleTimeframe, NormalizedCandle } from "@/modules/market-data/normalize-candles";

export type StoreCandlesResult = {
  processedCandles: number;
};

export type ListCandlesInput = {
  symbol: string;
  timeframe: CandleTimeframe;
  limit?: number;
  fromOpenTime?: Date;
  source?: string;
};

export type CandleRepository = {
  storeCandles(input: {
    symbol: string;
    timeframe: CandleTimeframe;
    candles: ReadonlyArray<NormalizedCandle>;
    source?: string;
  }): Promise<StoreCandlesResult>;
  listCandles(input: ListCandlesInput): ReturnType<typeof listCandles>;
  listCandlesWithPreferredSource(input: {
    symbol: string;
    timeframe: CandleTimeframe;
    limit?: number;
    fromOpenTime?: Date;
    preferredSource: string;
  }): ReturnType<typeof listCandlesWithPreferredSource>;
};

const DEFAULT_CANDLE_LIMIT = 500;

export async function listCandles(input: ListCandlesInput) {
  const orderDirection = input.fromOpenTime ? "asc" : "desc";
  const candles = await db.candle.findMany({
    where: {
      symbol: input.symbol,
      timeframe: input.timeframe,
      ...(input.source
        ? {
            source: input.source,
          }
        : {}),
      ...(input.fromOpenTime
        ? {
            openTime: {
              gte: input.fromOpenTime,
            },
          }
        : {}),
    },
    orderBy: {
      openTime: orderDirection,
    },
    take: input.limit ?? DEFAULT_CANDLE_LIMIT,
  });

  return orderDirection === "desc" ? candles.reverse() : candles;
}

export async function listCandlesWithPreferredSource(input: {
  symbol: string;
  timeframe: CandleTimeframe;
  limit?: number;
  fromOpenTime?: Date;
  preferredSource: string;
}) {
  const preferredCandles = await listCandles({
    symbol: input.symbol,
    timeframe: input.timeframe,
    limit: input.limit,
    fromOpenTime: input.fromOpenTime,
    source: input.preferredSource,
  });

  if (preferredCandles.length > 0) {
    return preferredCandles;
  }

  return listCandles({
    symbol: input.symbol,
    timeframe: input.timeframe,
    limit: input.limit,
    fromOpenTime: input.fromOpenTime,
  });
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
  listCandlesWithPreferredSource,
};
