import { createBinancePublicDataClient, type BinancePublicDataArchiveSpec, type BinancePublicDataClient } from "@/modules/market-data/binance-public-data-client";
import { parseBinancePublicDataArchive } from "@/modules/market-data/binance-public-data-parser";
import { candleRepository, type CandleRepository } from "@/modules/market-data/candle-repository";
import { normalizeCandles, type CandleTimeframe, type RawCandle } from "@/modules/market-data/normalize-candles";

const DEFAULT_SYMBOLS = ["BTC", "ETH"] as const;
const DEFAULT_TIMEFRAMES: CandleTimeframe[] = ["15m", "1h", "4h", "1d"];
const DEFAULT_BACKFILL_DAYS = 365;

export type HistoricalBackfillResult = {
  processedCandles: number;
  downloadedArchives: number;
  skippedArchives: number;
};

export type HistoricalBackfillDependencies = {
  archiveClient?: BinancePublicDataClient;
  repository?: CandleRepository;
  parseArchive?: (archive: ArrayBuffer | Uint8Array) => RawCandle[];
  plan?: ReadonlyArray<BinancePublicDataArchiveSpec>;
  now?: Date;
};

export type BuildBackfillPlanInput = {
  symbols?: readonly string[];
  timeframes?: CandleTimeframe[];
  startDate: Date;
  endDate: Date;
};

// 把业务符号统一映射到 Binance public-data 使用的交易对符号。
function toMarketSymbol(symbol: string) {
  const normalizedSymbol = symbol.trim().toUpperCase();

  return normalizedSymbol.endsWith("USDT") ? normalizedSymbol : `${normalizedSymbol}USDT`;
}

// 只保留 UTC 日期粒度，避免本地时区把 daily/monthly 切分边界带偏。
function toUtcDate(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// 按 UTC 日期做加减，保持计划生成稳定可预测。
function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return toUtcDate(next);
}

// 每个月的边界用于判断该月是完整覆盖还是只覆盖了局部日期。
function startOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function formatMonthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatDayKey(date: Date) {
  return `${formatMonthKey(date)}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

// 统一生成 public-data 目录结构里的相对路径，供下载客户端与测试断言共用。
function buildArchivePath(
  marketSymbol: string,
  timeframe: CandleTimeframe,
  period: "daily" | "monthly",
  dateKey: string
) {
  return `/data/futures/um/${period}/klines/${marketSymbol}/${timeframe}/${marketSymbol}-${timeframe}-${dateKey}.zip`;
}

// 把日期范围拆成“完整月份走 monthly、残缺月份走 daily”的下载计划，减少请求数量。
export function buildBackfillArchivePlan(input: BuildBackfillPlanInput): BinancePublicDataArchiveSpec[] {
  const symbols = input.symbols ?? DEFAULT_SYMBOLS;
  const timeframes = input.timeframes ?? DEFAULT_TIMEFRAMES;
  const startDate = toUtcDate(input.startDate);
  const endDate = toUtcDate(input.endDate);
  const plan: BinancePublicDataArchiveSpec[] = [];

  for (const symbol of symbols) {
    const marketSymbol = toMarketSymbol(symbol);

    for (const timeframe of timeframes) {
      for (
        let monthCursor = startOfUtcMonth(startDate);
        monthCursor.getTime() <= endDate.getTime();
        monthCursor = startOfUtcMonth(addUtcDays(endOfUtcMonth(monthCursor), 1))
      ) {
        const monthStart = monthCursor;
        const monthEnd = endOfUtcMonth(monthCursor);
        const rangeStart = startDate.getTime() > monthStart.getTime() ? startDate : monthStart;
        const rangeEnd = endDate.getTime() < monthEnd.getTime() ? endDate : monthEnd;
        const coversWholeMonth =
          rangeStart.getTime() === monthStart.getTime() &&
          rangeEnd.getTime() === monthEnd.getTime();

        if (coversWholeMonth) {
          const dateKey = formatMonthKey(monthCursor);

          plan.push({
            symbol,
            marketSymbol,
            timeframe,
            period: "monthly",
            dateKey,
            path: buildArchivePath(marketSymbol, timeframe, "monthly", dateKey),
          });

          continue;
        }

        for (
          let dayCursor = rangeStart;
          dayCursor.getTime() <= rangeEnd.getTime();
          dayCursor = addUtcDays(dayCursor, 1)
        ) {
          const dateKey = formatDayKey(dayCursor);

          plan.push({
            symbol,
            marketSymbol,
            timeframe,
            period: "daily",
            dateKey,
            path: buildArchivePath(marketSymbol, timeframe, "daily", dateKey),
          });
        }
      }
    }
  }

  return plan;
}

// 默认回填窗口是“昨天往前 365 天”，避免拿到今天尚未完整落盘的 daily 文件。
function buildDefaultBackfillPlan(now: Date) {
  const endDate = addUtcDays(toUtcDate(now), -1);
  const startDate = addUtcDays(endDate, -(DEFAULT_BACKFILL_DAYS - 1));

  return buildBackfillArchivePlan({
    startDate,
    endDate,
  });
}

// 逐个归档下载、解析、归一化并落库；404 归档跳过，重复执行依赖 upsert 保持幂等。
export async function backfillHistoricalCandles(
  dependencies: HistoricalBackfillDependencies = {}
): Promise<HistoricalBackfillResult> {
  const archiveClient = dependencies.archiveClient ?? createBinancePublicDataClient();
  const repository = dependencies.repository ?? candleRepository;
  const parseArchive = dependencies.parseArchive ?? parseBinancePublicDataArchive;
  const plan = dependencies.plan ?? buildDefaultBackfillPlan(dependencies.now ?? new Date());

  let processedCandles = 0;
  let downloadedArchives = 0;
  let skippedArchives = 0;

  for (const archiveSpec of plan) {
    const archive = await archiveClient.fetchArchive(archiveSpec);

    if (!archive) {
      skippedArchives += 1;
      continue;
    }

    const rawCandles = parseArchive(archive);
    const normalizedCandles = normalizeCandles(rawCandles);
    const result = await repository.storeCandles({
      symbol: archiveSpec.symbol,
      timeframe: archiveSpec.timeframe,
      candles: normalizedCandles,
      source: "binance-public-data",
    });

    downloadedArchives += 1;
    processedCandles += result.processedCandles;
  }

  return {
    processedCandles,
    downloadedArchives,
    skippedArchives,
  };
}
