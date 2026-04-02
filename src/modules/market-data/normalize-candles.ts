export type CandleTimeframe = "15m" | "1h" | "4h" | "1d";

export type RawCandle = {
  openTime: number | Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type NormalizedCandle = Omit<RawCandle, "openTime"> & {
  openTime: Date;
};

function toOpenTimeMs(openTime: number | Date) {
  return openTime instanceof Date ? openTime.getTime() : openTime;
}

function assertFiniteNumber(value: unknown, field: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`invalid candle ${field}`);
  }

  return value;
}

export function normalizeCandles(rawCandles: ReadonlyArray<RawCandle>): NormalizedCandle[] {
  const sortedCandles = [...rawCandles].sort((left, right) => toOpenTimeMs(left.openTime) - toOpenTimeMs(right.openTime));
  const seenOpenTimes = new Set<number>();

  return sortedCandles.map((candle) => {
    const openTimeMs = assertFiniteNumber(toOpenTimeMs(candle.openTime), "openTime");

    if (seenOpenTimes.has(openTimeMs)) {
      throw new Error("duplicate candle openTime");
    }

    seenOpenTimes.add(openTimeMs);

    // Normalize to a Prisma-friendly Date before persistence.
    return {
      open: assertFiniteNumber(candle.open, "open"),
      high: assertFiniteNumber(candle.high, "high"),
      low: assertFiniteNumber(candle.low, "low"),
      close: assertFiniteNumber(candle.close, "close"),
      volume: candle.volume === undefined ? undefined : assertFiniteNumber(candle.volume, "volume"),
      openTime: new Date(openTimeMs),
    };
  });
}
