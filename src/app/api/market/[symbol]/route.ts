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

function buildResponse(input: {
  symbol: string;
  timeframe: CandleTimeframe;
  candles: Awaited<ReturnType<typeof candleRepository.listCandles>>;
  warning?: string | null;
}) {
  const warning = input.warning ?? null;

  return NextResponse.json({
    symbol: input.symbol,
    timeframe: input.timeframe,
    candles: input.candles,
    warning,
    stale: warning !== null,
  });
}

function formatRefreshError(error: unknown) {
  return error instanceof Error ? error.message : "unknown fetch error";
}

async function refreshCandlesInBackground(symbol: string, timeframe: CandleTimeframe) {
  try {
    await fetchAndStoreCandles([symbol], { timeframes: [timeframe] });
  } catch (error) {
    console.warn(
      `[market] background refresh failed for ${symbol} ${timeframe}: ${formatRefreshError(error)}`,
    );
  }
}

export async function GET(request: Request, context: MarketRouteContext) {
  const { symbol } = await context.params;
  const timeframe = parseTimeframe(new URL(request.url).searchParams.get("timeframe"));
  const cachedCandles = await candleRepository.listCandles({ symbol, timeframe });

  if (cachedCandles.length > 0) {
    void refreshCandlesInBackground(symbol, timeframe);

    return buildResponse({
      symbol,
      timeframe,
      candles: cachedCandles,
    });
  }

  try {
    await fetchAndStoreCandles([symbol], { timeframes: [timeframe] });
    const candles = await candleRepository.listCandles({ symbol, timeframe });

    return buildResponse({
      symbol,
      timeframe,
      candles,
    });
  } catch (error) {
    console.warn(`[market] refresh failed for ${symbol} ${timeframe}: ${formatRefreshError(error)}`);

    return buildResponse({
      symbol,
      timeframe,
      candles: [],
      warning: "Binance 行情暂时不可用，本地也没有缓存。",
    });
  }
}
