import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
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
const CANDLE_UPSERT_BATCH_SIZE = 50;

function chunkCandles(candles: ReadonlyArray<NormalizedCandle>) {
  const chunks: NormalizedCandle[][] = [];

  for (let index = 0; index < candles.length; index += CANDLE_UPSERT_BATCH_SIZE) {
    chunks.push(candles.slice(index, index + CANDLE_UPSERT_BATCH_SIZE));
  }

  return chunks;
}

function buildCandleUpsertStatement(input: {
  symbol: string;
  timeframe: CandleTimeframe;
  candles: ReadonlyArray<NormalizedCandle>;
  source: string;
}) {
  const rows = input.candles.map(
    (candle) => Prisma.sql`
      (
        ${randomUUID()},
        ${input.symbol},
        ${input.timeframe},
        ${candle.openTime},
        ${candle.open},
        ${candle.high},
        ${candle.low},
        ${candle.close},
        ${candle.volume ?? null},
        ${input.source}
      )
    `,
  );

  return Prisma.sql`
    INSERT INTO "Candle" (
      "id",
      "symbol",
      "timeframe",
      "openTime",
      "open",
      "high",
      "low",
      "close",
      "volume",
      "source"
    )
    VALUES ${Prisma.join(rows)}
    ON CONFLICT ("symbol", "timeframe", "openTime") DO UPDATE SET
      "open" = excluded."open",
      "high" = excluded."high",
      "low" = excluded."low",
      "close" = excluded."close",
      "volume" = excluded."volume",
      "source" = excluded."source"
  `;
}

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

  for (const candles of chunkCandles(input.candles)) {
    await db.$executeRaw(
      buildCandleUpsertStatement({
        symbol: input.symbol,
        timeframe: input.timeframe,
        candles,
        source,
      }),
    );
  }

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
