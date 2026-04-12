import { db } from "@/lib/db";
import type {
  AnalysisCandle,
  AnalysisSymbol,
  AnalysisTimeframe,
} from "@/components/analysis/analysis-data";

export type ReadAnalysisCandlesResult = {
  candles: AnalysisCandle[];
  warnings: string[];
};

const ANALYSIS_CANDLE_LIMIT = 24;

const TIMEFRAME_MINUTES: Record<AnalysisTimeframe, number> = {
  "15m": 15,
  "1h": 60,
  "4h": 240,
  "1d": 1440,
};

const FRESHNESS_MULTIPLIER: Record<AnalysisTimeframe, number> = {
  // 分钟级周期更新较密集，允许若干个完整周期作为缓冲，避免刚同步完就误报滞后。
  "15m": 4,
  "1h": 4,
  // 高周期本身更慢，阈值可以更宽松一些，但仍然只按完整周期数判断。
  "4h": 3,
  "1d": 3,
};

// 将数据库中的 Candle 行转换成分析页需要的轻量 candle 结构。
function toAnalysisCandle(row: {
  openTime: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}): AnalysisCandle {
  return {
    openTime: row.openTime.toISOString(),
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    volume: row.volume,
  };
}

// 根据周期推导“最新 K 线应该有多新”。
function getFreshnessThresholdMs(timeframe: AnalysisTimeframe): number {
  return TIMEFRAME_MINUTES[timeframe] * FRESHNESS_MULTIPLIER[timeframe] * 60_000;
}

// 对最新一根 K 线做 freshness 检查，超阈值就返回滞后提示。
function buildFreshnessWarning(
  openTime: Date,
  timeframe: AnalysisTimeframe,
  now: Date
): string | null {
  const ageMs = now.getTime() - openTime.getTime();
  const freshnessThresholdMs = getFreshnessThresholdMs(timeframe);

  if (ageMs > freshnessThresholdMs) {
    return "市场数据可能已滞后。";
  }

  return null;
}

// 分析页只从 Candle 表读取最近一段真实 K 线，不再兜底到 demo 数据。
export async function readAnalysisCandles(input: {
  symbol: AnalysisSymbol;
  timeframe: AnalysisTimeframe;
  now?: Date;
}): Promise<ReadAnalysisCandlesResult> {
  const now = input.now ?? new Date();

  const rows = await db.candle.findMany({
    where: {
      symbol: input.symbol,
      timeframe: input.timeframe,
    },
    orderBy: {
      openTime: "desc",
    },
    take: ANALYSIS_CANDLE_LIMIT,
  });

  if (rows.length === 0) {
    return {
      candles: [],
      warnings: ["尚未同步市场数据。"],
    };
  }

  const candles = [...rows].reverse().map((row) => toAnalysisCandle(row));
  const latestRow = rows[0];
  const staleWarning = buildFreshnessWarning(latestRow.openTime, input.timeframe, now);

  return {
    candles,
    warnings: staleWarning ? [staleWarning] : [],
  };
}
