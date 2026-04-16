import { NextResponse } from "next/server";
import { candleRepository } from "@/modules/market-data/candle-repository";
import { fetchAndStoreCandles } from "@/modules/market-data/fetch-and-store-candles";
import type { CandleTimeframe } from "@/modules/market-data/normalize-candles";

type MarketRouteContext = {
  params: Promise<{
    symbol: string;
  }>;
};

const DEFAULT_TIMEFRAME: CandleTimeframe = "1h";
const SUPPORTED_TIMEFRAMES = new Set<CandleTimeframe>(["15m", "1h", "4h", "1d"]);

function parseTimeframe(value: string | null): CandleTimeframe {
  if (value && SUPPORTED_TIMEFRAMES.has(value as CandleTimeframe)) {
    return value as CandleTimeframe;
  }

  return DEFAULT_TIMEFRAME;
}

export async function GET(request: Request, context: MarketRouteContext) {
  const { symbol } = await context.params;
  const timeframe = parseTimeframe(new URL(request.url).searchParams.get("timeframe"));

  let candles = await candleRepository.listCandles({ symbol, timeframe });

  if (candles.length === 0) {
    await fetchAndStoreCandles([symbol], { timeframes: [timeframe] });
    candles = await candleRepository.listCandles({ symbol, timeframe });
  }

  return NextResponse.json({ symbol, timeframe, candles });
}
