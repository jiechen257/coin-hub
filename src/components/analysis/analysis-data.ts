import { buildChanState } from "@/modules/chan/build-chan-state";
import type { Candle } from "@/modules/chan/types";
import { buildTradeSignal, type TradeSignal } from "@/modules/signals/build-trade-signal";
import { attributeViewpoint, type RawTweet, type ViewpointBias } from "@/modules/tweets/attribute-viewpoints";
import { formatSignalBias } from "@/lib/display-text";

export type AnalysisSymbol = "BTC" | "ETH";
export type AnalysisTimeframe = "15m" | "1h" | "4h" | "1d";

export type AnalysisCandle = {
  openTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

export type AnalysisMarkerTone = "bullish" | "bearish" | "neutral";

export type AnalysisMarker = {
  time: string;
  position: "aboveBar" | "belowBar" | "inBar";
  label: string;
  text: string;
  tone: AnalysisMarkerTone;
};

export type AnalysisViewpoint = {
  id: string;
  tweetId: string;
  symbol: string | null;
  bias: ViewpointBias;
  reasoning: string | null;
  evidenceTerms: string[];
  confidence: number;
  sourceType: "rule" | "stored" | "demo";
  publishedAt: string;
  author: string;
  text: string;
};

export type AnalysisPayload = {
  selection: {
    symbol: AnalysisSymbol;
    timeframe: AnalysisTimeframe;
  };
  chart: {
    candles: AnalysisCandle[];
    structureMarkers: AnalysisMarker[];
    signalMarkers: AnalysisMarker[];
    tweetMarkers: AnalysisMarker[];
  };
  viewpoints: AnalysisViewpoint[];
  signal: TradeSignal & {
    timeframe: AnalysisTimeframe;
    summary: string;
  };
  evidence: string[];
  warnings: string[];
};

export type AnalysisSignal = AnalysisPayload["signal"];

const SUPPORTED_SYMBOLS: AnalysisSymbol[] = ["BTC", "ETH"];
const SUPPORTED_TIMEFRAMES: AnalysisTimeframe[] = ["15m", "1h", "4h", "1d"];

const TIMEFRAME_MINUTES: Record<AnalysisTimeframe, number> = {
  "15m": 15,
  "1h": 60,
  "4h": 240,
  "1d": 1440,
};

const SYMBOL_BASE_PRICE: Record<AnalysisSymbol, number> = {
  BTC: 68_000,
  ETH: 3_400,
};

function normalizeSymbol(input: string): AnalysisSymbol {
  const upper = input.toUpperCase();

  if (SUPPORTED_SYMBOLS.includes(upper as AnalysisSymbol)) {
    return upper as AnalysisSymbol;
  }

  return "BTC";
}

function normalizeTimeframe(input: string | null | undefined): AnalysisTimeframe {
  if (input && SUPPORTED_TIMEFRAMES.includes(input as AnalysisTimeframe)) {
    return input as AnalysisTimeframe;
  }

  return "1h";
}

function toIsoTime(value: Date | number | string): string {
  return new Date(value).toISOString();
}

function mapCandlesToChanInput(symbol: AnalysisSymbol, candles: AnalysisCandle[]): Candle[] {
  return candles.map((candle) => ({
    symbol,
    openTime: new Date(candle.openTime),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume ?? undefined,
  }));
}

function buildDemoCandles(symbol: AnalysisSymbol, timeframe: AnalysisTimeframe): AnalysisCandle[] {
  const minutes = TIMEFRAME_MINUTES[timeframe];
  const start = Date.UTC(2026, 3, 1, 0, 0, 0);
  const base = SYMBOL_BASE_PRICE[symbol];
  const bias = symbol === "BTC" ? 1 : 0.6;

  return Array.from({ length: 24 }, (_, index) => {
    const open = base + index * bias * 18 + (timeframe === "1d" ? index * 25 : index * 4);
    const close = open + (index % 3 === 0 ? bias * 12 : bias * 8);
    const high = Math.max(open, close) + bias * 10;
    const low = Math.min(open, close) - bias * 9;

    return {
      openTime: toIsoTime(start + index * minutes * 60_000),
      open,
      high,
      low,
      close,
      volume: 1000 + index * 55,
    };
  });
}

function buildDemoRawTweets(symbol: AnalysisSymbol, timeframe: AnalysisTimeframe): RawTweet[] {
  const prefix = symbol === "BTC" ? "BTC" : "ETH";

  return [
    {
      id: `${symbol.toLowerCase()}-tweet-1`,
      author: "research-bot",
      text: `${prefix} 在 ${timeframe} 周期保持上行结构，高点持续抬升，观点偏看多。`,
      publishedAt: "2026-04-01T12:00:00.000Z",
    },
    {
      id: `${symbol.toLowerCase()}-tweet-2`,
      author: "research-bot",
      text: `${prefix} 回踩后仍有承接，只要趋势未转弱，当前仍偏多头。`,
      publishedAt: "2026-04-01T15:00:00.000Z",
    },
  ];
}

function pickRelevantTweets(tweets: RawTweet[], symbol: AnalysisSymbol): RawTweet[] {
  const matched = tweets.filter((tweet) => new RegExp(`\\b${symbol}\\b`, "i").test(tweet.text));

  return (matched.length > 0 ? matched : tweets).slice(0, 4);
}

async function deriveViewpointsFromTweets(
  tweets: RawTweet[],
  symbol: AnalysisSymbol
): Promise<AnalysisViewpoint[]> {
  const relevantTweets = pickRelevantTweets(tweets, symbol);
  const drafts = await Promise.all(relevantTweets.map((tweet) => attributeViewpoint(tweet)));

  return drafts.map((draft, index) => {
    const tweet = relevantTweets[index];

    return {
      id: draft.tweetId,
      tweetId: draft.tweetId,
      symbol: draft.symbol,
      bias: draft.bias,
      reasoning: draft.reasoning,
      evidenceTerms: draft.evidenceTerms,
      confidence: draft.confidence,
      sourceType: "rule",
      publishedAt: toIsoTime(tweet.publishedAt),
      author: tweet.author ?? "unknown",
      text: tweet.text,
    };
  });
}

function buildStructureMarkers(
  candles: AnalysisCandle[],
  trendBias: "up" | "down" | "sideways"
): AnalysisMarker[] {
  if (candles.length === 0) {
    return [];
  }

  const first = candles[0];
  const last = candles[candles.length - 1];
  const tone: AnalysisMarkerTone =
    trendBias === "up" ? "bullish" : trendBias === "down" ? "bearish" : "neutral";

  return [
    {
      time: first.openTime,
      position: "belowBar",
      label: "起",
      text: "区间起点",
      tone: "neutral",
    },
    {
      time: last.openTime,
      position: trendBias === "up" ? "belowBar" : "aboveBar",
      label: trendBias === "up" ? "升" : trendBias === "down" ? "跌" : "盘",
      text:
        trendBias === "up"
          ? "结构：上行"
          : trendBias === "down"
            ? "结构：下行"
            : "结构：震荡",
      tone,
    },
  ];
}

function buildSignalMarkers(
  candles: AnalysisCandle[],
  signal: AnalysisPayload["signal"]
): AnalysisMarker[] {
  const last = candles[candles.length - 1];

  if (!last) {
    return [];
  }

  return [
    {
      time: last.openTime,
      position: signal.bias === "long" ? "belowBar" : "aboveBar",
      label: signal.bias === "long" ? "多" : "等",
      text: `信号 ${signal.confidence.toFixed(2)}`,
      tone: signal.bias === "long" ? "bullish" : "neutral",
    },
  ];
}

function buildTweetMarkers(
  candles: AnalysisCandle[],
  viewpoints: AnalysisViewpoint[]
): AnalysisMarker[] {
  if (candles.length === 0) {
    return [];
  }

  return viewpoints.slice(0, 4).map((viewpoint, index) => {
    const candle = candles[Math.max(candles.length - 1 - index, 0)];
    const tone: AnalysisMarkerTone =
      viewpoint.bias === "bullish"
        ? "bullish"
        : viewpoint.bias === "bearish"
          ? "bearish"
          : "neutral";

    return {
      time: candle.openTime,
      position: viewpoint.bias === "bullish" ? "belowBar" : "aboveBar",
      label: viewpoint.bias === "bullish" ? "TW+" : viewpoint.bias === "bearish" ? "TW-" : "TW",
      text: viewpoint.reasoning ?? viewpoint.text,
      tone,
    };
  });
}

function readWarnings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function collectEvidence(
  symbol: AnalysisSymbol,
  timeframe: AnalysisTimeframe,
  candles: AnalysisCandle[],
  viewpoints: AnalysisViewpoint[],
  signal: TradeSignal
): string[] {
  const lastClose = candles[candles.length - 1]?.close;
  const evidence = [
    `${symbol} ${timeframe} K 线数量：${candles.length}`,
    `趋势判断：${formatSignalBias(signal.bias)}`,
    `置信度：${signal.confidence.toFixed(2)}`,
  ];

  if (typeof lastClose === "number") {
    evidence.push(`最新收盘价：${lastClose.toFixed(2)}`);
  }

  for (const viewpoint of viewpoints.slice(0, 3)) {
    evidence.push(
      viewpoint.reasoning ?? `来自 ${viewpoint.author} 的${formatSignalBias(viewpoint.bias)}观点`,
    );
  }

  return evidence;
}

export async function loadAnalysisPayload(input: {
  symbol: string;
  timeframe?: string | null;
}): Promise<AnalysisPayload> {
  const symbol = normalizeSymbol(input.symbol);
  const timeframe = normalizeTimeframe(input.timeframe);
  const candles = buildDemoCandles(symbol, timeframe);
  const chanState = buildChanState(mapCandlesToChanInput(symbol, candles));
  const viewpoints = await deriveViewpointsFromTweets(buildDemoRawTweets(symbol, timeframe), symbol);
  const warnings = [
    `${symbol} ${timeframe} 当前展示的是演示研究切片。`,
    "分析工作台暂未接入实时市场数据仓库。",
  ];

  const baseSignal = buildTradeSignal({
    chanState,
    evidence: [],
  });

  const evidence = collectEvidence(symbol, timeframe, candles, viewpoints, baseSignal);
  const signal = {
    ...baseSignal,
    timeframe,
    summary: chanState.structureSummary,
    evidence,
  };

  return {
    selection: {
      symbol,
      timeframe,
    },
    chart: {
      candles,
      structureMarkers: buildStructureMarkers(candles, chanState.trendBias),
      signalMarkers: buildSignalMarkers(candles, signal),
      tweetMarkers: buildTweetMarkers(candles, viewpoints),
    },
    viewpoints,
    signal,
    evidence,
    warnings,
  };
}
