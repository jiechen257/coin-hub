import {
  DEFAULT_REVIEW_TAGS,
  getReviewTagKind,
} from "@/modules/outcomes/review-tag-catalog";
import { ensureResearchDeskSchema } from "@/lib/research-desk-schema-bootstrap";
import type {
  ResearchDeskChartSlicePayload,
  ResearchDeskOutcome,
  ResearchDeskOutcomeAggregates,
  ResearchDeskReviewTagOption,
  ResearchDeskSymbol,
  ResearchDeskTimeframe,
} from "@/components/research-desk/research-desk-types";

const DEFAULT_SYMBOL: ResearchDeskSymbol = "BTC";
const DEFAULT_TIMEFRAME: ResearchDeskTimeframe = "1h";
const SUPPORTED_SYMBOLS = new Set<ResearchDeskSymbol>(["BTC", "ETH"]);
const SUPPORTED_TIMEFRAMES = new Set<ResearchDeskTimeframe>([
  "15m",
  "1h",
  "4h",
  "1d",
]);
const reviewTagOrder = new Map<string, number>(
  DEFAULT_REVIEW_TAGS.map((label, index) => [label, index]),
);

type SliceOutcome = Awaited<
  ReturnType<
    Awaited<typeof import("@/modules/outcomes/outcome-repository")>["outcomeRepository"]["listSliceOutcomes"]
  >
>[number];

type SliceCandle = {
  openTime: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

function prepareResearchDeskLoaderEnv() {
  if (process.env.VITEST) {
    process.env.TURSO_DATABASE_URL = "";
    process.env.TURSO_AUTH_TOKEN = "";
  }
}

async function loadSliceDependencies() {
  prepareResearchDeskLoaderEnv();

  const [
    { db },
    { candleRepository },
    { createBinanceClient },
    { normalizeCandles },
    { outcomeRepository },
    { fetchAndStoreCandles },
    { syncOutcomesForRecordId },
  ] = await Promise.all([
    import("@/lib/db"),
    import("@/modules/market-data/candle-repository"),
    import("@/modules/market-data/binance-client"),
    import("@/modules/market-data/normalize-candles"),
    import("@/modules/outcomes/outcome-repository"),
    import("@/modules/market-data/fetch-and-store-candles"),
    import("@/modules/outcomes/outcome-service"),
  ]);

  return {
    db,
    candleRepository,
    createBinanceClient,
    normalizeCandles,
    outcomeRepository,
    fetchAndStoreCandles,
    syncOutcomesForRecordId,
  };
}

function formatRefreshError(error: unknown) {
  return error instanceof Error ? error.message : "unknown fetch error";
}

function shouldUseTransientCandles() {
  return Boolean(process.env.VERCEL) && !process.env.VITEST;
}

async function loadTransientBinanceCandles(input: {
  symbol: ResearchDeskSymbol;
  timeframe: ResearchDeskTimeframe;
  createBinanceClient: Awaited<
    typeof import("@/modules/market-data/binance-client")
  >["createBinanceClient"];
  normalizeCandles: Awaited<
    typeof import("@/modules/market-data/normalize-candles")
  >["normalizeCandles"];
}): Promise<SliceCandle[]> {
  const client = input.createBinanceClient();
  const rawCandles = await client.fetchCandles(input.symbol, input.timeframe);
  return input.normalizeCandles(rawCandles).map((candle) => ({
    ...candle,
    volume: candle.volume ?? null,
  }));
}

function compareReviewTagLabels(left: string, right: string) {
  const leftIndex = reviewTagOrder.get(left) ?? Number.MAX_SAFE_INTEGER;
  const rightIndex = reviewTagOrder.get(right) ?? Number.MAX_SAFE_INTEGER;

  if (leftIndex !== rightIndex) {
    return leftIndex - rightIndex;
  }

  return left.localeCompare(right, "zh-Hans-CN");
}

export function serializeOutcome(input: SliceOutcome): ResearchDeskOutcome {
  return {
    id: input.id,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    recordId: input.recordId,
    planId: input.planId,
    symbol: input.symbol as ResearchDeskSymbol,
    timeframe: input.timeframe as ResearchDeskTimeframe,
    windowType: input.windowType,
    windowStartAt: input.windowStartAt.toISOString(),
    windowEndAt: input.windowEndAt.toISOString(),
    resultLabel: input.resultLabel as ResearchDeskOutcome["resultLabel"],
    resultReason: input.resultReason,
    forwardReturnPercent: input.forwardReturnPercent,
    maxFavorableExcursionPercent: input.maxFavorableExcursionPercent,
    maxAdverseExcursionPercent: input.maxAdverseExcursionPercent,
    ruleVersion: input.ruleVersion,
    computedAt: input.computedAt.toISOString(),
    reviewTags: [...input.reviewTags].sort(compareReviewTagLabels),
  };
}

export function buildReviewTagOptions(
  outcomes: ResearchDeskOutcome[],
): ResearchDeskReviewTagOption[] {
  const labels = new Set<string>(DEFAULT_REVIEW_TAGS);

  for (const outcome of outcomes) {
    for (const reviewTag of outcome.reviewTags) {
      labels.add(reviewTag);
    }
  }

  return [...labels]
    .sort(compareReviewTagLabels)
    .map((label) => ({
      label,
      kind: getReviewTagKind(label),
    }));
}

export function buildOutcomeSummary(
  outcomes: ResearchDeskOutcome[],
): ResearchDeskOutcomeAggregates {
  const counts: ResearchDeskOutcomeAggregates["counts"] = {
    good: 0,
    neutral: 0,
    bad: 0,
    pending: 0,
    total: outcomes.length,
  };
  const reviewTagCounts = new Map<string, number>();

  for (const outcome of outcomes) {
    counts[outcome.resultLabel] += 1;

    for (const reviewTag of outcome.reviewTags) {
      reviewTagCounts.set(reviewTag, (reviewTagCounts.get(reviewTag) ?? 0) + 1);
    }
  }

  return {
    counts,
    reviewTags: [...reviewTagCounts.entries()]
      .map(([label, count]) => ({
        label,
        count,
        kind: getReviewTagKind(label),
      }))
      .sort((left, right) => {
        if (left.count !== right.count) {
          return right.count - left.count;
        }

        return compareReviewTagLabels(left.label, right.label);
      }),
  };
}

export function parseSymbol(value: string | null): ResearchDeskSymbol {
  if (value && SUPPORTED_SYMBOLS.has(value as ResearchDeskSymbol)) {
    return value as ResearchDeskSymbol;
  }

  return DEFAULT_SYMBOL;
}

export function parseTimeframe(value: string | null): ResearchDeskTimeframe {
  if (value && SUPPORTED_TIMEFRAMES.has(value as ResearchDeskTimeframe)) {
    return value as ResearchDeskTimeframe;
  }

  return DEFAULT_TIMEFRAME;
}

export async function loadResearchDeskChartSlice(input: {
  symbol: ResearchDeskSymbol;
  timeframe: ResearchDeskTimeframe;
}): Promise<ResearchDeskChartSlicePayload> {
  await ensureResearchDeskSchema();
  const {
    db,
    candleRepository,
    createBinanceClient,
    normalizeCandles,
    outcomeRepository,
    fetchAndStoreCandles,
    syncOutcomesForRecordId,
  } = await loadSliceDependencies();
  const useTransientCandles = shouldUseTransientCandles();
  let candles: SliceCandle[] = [];
  let outcomes: SliceOutcome[] = [];

  if (useTransientCandles) {
    try {
      candles = await loadTransientBinanceCandles({
        symbol: input.symbol,
        timeframe: input.timeframe,
        createBinanceClient,
        normalizeCandles,
      });
    } catch (error) {
      console.warn(
        `[research-desk] failed to load transient ${input.symbol} ${input.timeframe} candles: ${formatRefreshError(error)}`,
      );
    }
  } else if (!process.env.VITEST) {
    try {
      await fetchAndStoreCandles([input.symbol], {
        repository: candleRepository,
        timeframes: [input.timeframe],
      });
    } catch (error) {
      console.warn(
        `[research-desk] failed to refresh ${input.symbol} ${input.timeframe} candles: ${formatRefreshError(error)}`,
      );
    }
  }

  try {
    const records = await db.traderRecord.findMany({
      where: {
        symbol: input.symbol,
        archivedAt: null,
        OR: [{ timeframe: input.timeframe }, { timeframe: null }],
      },
      select: {
        id: true,
      },
    });

    if (!useTransientCandles) {
      await Promise.all(
        records.map(async (record) => {
          try {
            await syncOutcomesForRecordId(record.id, input.timeframe);
          } catch (error) {
            console.warn(
              `[research-desk] failed to refresh outcome ${record.id} on ${input.symbol} ${input.timeframe}: ${formatRefreshError(error)}`,
            );
          }
        }),
      );
    }

    outcomes = await outcomeRepository.listSliceOutcomes({
      symbol: input.symbol,
      timeframe: input.timeframe,
    });
  } catch (error) {
    console.warn(
      `[research-desk] failed to load db-backed slice data for ${input.symbol} ${input.timeframe}: ${formatRefreshError(error)}`,
    );
  }

  if (candles.length === 0) {
    try {
      candles = await candleRepository.listCandlesWithPreferredSource({
        symbol: input.symbol,
        timeframe: input.timeframe,
        preferredSource: "binance",
      });
    } catch (error) {
      console.warn(
        `[research-desk] failed to read cached ${input.symbol} ${input.timeframe} candles: ${formatRefreshError(error)}`,
      );
    }
  }

  const serializedOutcomes = outcomes.map(serializeOutcome);

  return {
    selection: input,
    selectedOutcomeId: serializedOutcomes[0]?.id ?? null,
    reviewTagOptions: buildReviewTagOptions(serializedOutcomes),
    summary: buildOutcomeSummary(serializedOutcomes),
    chart: {
      candles: candles.map((candle) => ({
        openTime: candle.openTime.toISOString(),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      })),
      outcomes: serializedOutcomes,
    },
  };
}
