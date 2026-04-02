import type { Candle, ChanSegment, ChanState, ChanTrendBias } from "@/modules/chan/types";

function deriveTrendBias(candles: ReadonlyArray<Candle>): ChanTrendBias {
  if (candles.length < 2) {
    return "sideways";
  }

  const firstClose = candles[0].close;
  const lastClose = candles[candles.length - 1].close;

  if (lastClose > firstClose) {
    return "up";
  }

  if (lastClose < firstClose) {
    return "down";
  }

  return "sideways";
}

function deriveSymbol(candles: ReadonlyArray<Candle>) {
  return candles.find((candle) => candle.symbol)?.symbol ?? null;
}

function deriveSegments(candles: ReadonlyArray<Candle>, trendBias: ChanTrendBias): ChanSegment[] {
  if (candles.length < 2) {
    return [];
  }

  // Represent the first-pass structure as one segment spanning the observed sequence.
  return [
    {
      direction: trendBias,
      startTime: candles[0].openTime,
      endTime: candles[candles.length - 1].openTime,
    },
  ];
}

export function buildChanState(candles: ReadonlyArray<Candle>): ChanState {
  const symbol = deriveSymbol(candles);
  const trendBias = deriveTrendBias(candles);
  const segments = deriveSegments(candles, trendBias);

  // Keep the first-pass chan analyzer deliberately small, but keep the summary aligned with the state it returns.
  const structureSummary =
    segments.length === 0
      ? "暂无可用趋势结构"
      : `趋势 ${trendBias}，共 ${segments.length} 段`;

  return {
    symbol,
    trendBias,
    structureSummary,
    fractals: [],
    strokes: [],
    segments,
    zs: [],
    keyLevels: [],
    timeframeStates: {},
  };
}
