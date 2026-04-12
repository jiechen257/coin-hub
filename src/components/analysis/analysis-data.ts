import { buildChanState } from "@/modules/chan/build-chan-state";
import type { Candle, ChanState } from "@/modules/chan/types";
import { readAnalysisCandles } from "@/modules/market-data/read-analysis-candles";
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

// 只允许分析页使用明确支持的资产，未知输入统一回退到 BTC。
function normalizeSymbol(input: string): AnalysisSymbol {
  const upper = input.toUpperCase();

  if (SUPPORTED_SYMBOLS.includes(upper as AnalysisSymbol)) {
    return upper as AnalysisSymbol;
  }

  return "BTC";
}

// 统一约束时间周期输入，避免 query string 带来非法 timeframe。
function normalizeTimeframe(input: string | null | undefined): AnalysisTimeframe {
  if (input && SUPPORTED_TIMEFRAMES.includes(input as AnalysisTimeframe)) {
    return input as AnalysisTimeframe;
  }

  return "1h";
}

// 所有时间在 payload 中统一输出为 ISO 字符串，方便前端消费。
function toIsoTime(value: Date | number | string): string {
  return new Date(value).toISOString();
}

// 把分析页 candle 结构映射成缠论计算需要的 Candle 输入。
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

// 没有同步到市场数据时，仍然保留一个符号明确的空 chanState，方便 signal 正常产出。
function buildEmptyChanState(symbol: AnalysisSymbol): ChanState {
  return {
    symbol,
    trendBias: "sideways",
    structureSummary: "暂无可用趋势结构",
    fractals: [],
    strokes: [],
    segments: [],
    zs: [],
    keyLevels: [],
    timeframeStates: {},
  };
}

// 当前阶段观点仍沿用内置研究切片，只把 K 线来源替换成真实市场数据。
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

// 只保留与当前资产直接相关的推文，避免观点面板被无关内容稀释。
function pickRelevantTweets(tweets: RawTweet[], symbol: AnalysisSymbol): RawTweet[] {
  const matched = tweets.filter((tweet) => new RegExp(`\\b${symbol}\\b`, "i").test(tweet.text));

  return (matched.length > 0 ? matched : tweets).slice(0, 4);
}

// 复用现有规则归因逻辑，把原始推文转换成分析页观点卡片结构。
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

// 根据缠论趋势偏向生成最小化结构标记，保持图表信息密度稳定。
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

// 信号标记只锚定到最新一根 K 线，突出当前决策位置。
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

// 观点标记按时间倒序贴近最近几根 K 线，帮助把观点和价格上下文对齐。
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

// 把关键信息浓缩成证据列表，供信号面板与 API 一并消费。
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

// 分析页 payload 以真实 Candle 为主数据源，再复用既有信号与观点装配链路。
export async function loadAnalysisPayload(input: {
  symbol: string;
  timeframe?: string | null;
}): Promise<AnalysisPayload> {
  const symbol = normalizeSymbol(input.symbol);
  const timeframe = normalizeTimeframe(input.timeframe);
  // 先从 Candle 表读取最近一段真实 K 线；如果没有数据，直接保留空数组并打出显式告警。
  const marketData = await readAnalysisCandles({ symbol, timeframe });
  const candles = marketData.candles;
  const chanState =
    candles.length > 0
      ? buildChanState(mapCandlesToChanInput(symbol, candles))
      : buildEmptyChanState(symbol);
  const viewpoints = await deriveViewpointsFromTweets(buildDemoRawTweets(symbol, timeframe), symbol);
  const warnings = [...marketData.warnings];

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
