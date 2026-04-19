import { db } from "@/lib/db";
import { outcomeRepository } from "@/modules/outcomes/outcome-repository";
import {
  DEFAULT_REVIEW_TAGS,
  getReviewTagKind,
} from "@/modules/outcomes/review-tag-catalog";
import { candleRepository } from "@/modules/market-data/candle-repository";
import type {
  ResearchDeskOutcome,
  ResearchDeskOutcomeAggregates,
  ResearchDeskPayload,
  ResearchDeskPlan,
  ResearchDeskRecord,
  ResearchDeskReviewTagOption,
  ResearchDeskSymbol,
  ResearchDeskTimeframe,
  ResearchDeskTrader,
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
  ReturnType<typeof outcomeRepository.listSliceOutcomes>
>[number];

function isMissingOutcomeStorageError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("no such table") &&
    (error.message.includes("RecordOutcome") ||
      error.message.includes("ReviewTag") ||
      error.message.includes("RecordOutcomeReviewTag"))
  );
}

function compareReviewTagLabels(left: string, right: string) {
  const leftIndex = reviewTagOrder.get(left) ?? Number.MAX_SAFE_INTEGER;
  const rightIndex = reviewTagOrder.get(right) ?? Number.MAX_SAFE_INTEGER;

  if (leftIndex !== rightIndex) {
    return leftIndex - rightIndex;
  }

  return left.localeCompare(right, "zh-Hans-CN");
}

function serializeOutcome(input: SliceOutcome): ResearchDeskOutcome {
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

function buildReviewTagOptions(
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

function buildOutcomeSummary(
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

async function listSliceOutcomesSafely(input: {
  symbol: ResearchDeskSymbol;
  timeframe: ResearchDeskTimeframe;
}) {
  try {
    return await outcomeRepository.listSliceOutcomes(input);
  } catch (error) {
    if (isMissingOutcomeStorageError(error)) {
      return [];
    }

    throw error;
  }
}

function serializeTrader(input: {
  id: string;
  name: string;
  platform: string | null;
  notes: string | null;
}): ResearchDeskTrader {
  return {
    id: input.id,
    name: input.name,
    platform: input.platform,
    notes: input.notes,
  };
}

function serializePlan(input: {
  id: string;
  label: string;
  status: string;
  side: string;
  entryPrice: number | null;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  marketContext: string | null;
  triggerText: string;
  entryText: string;
  riskText: string | null;
  exitText: string | null;
  notes: string | null;
  sample:
    | {
        id: string;
        settledAt: Date;
        entryPrice: number;
        exitPrice: number;
        pnlValue: number;
        pnlPercent: number;
        holdingMinutes: number;
        maxDrawdownPercent: number | null;
        resultTag: string;
        notes: string | null;
      }
    | null;
}): ResearchDeskPlan {
  return {
    id: input.id,
    label: input.label,
    status: input.status,
    side: input.side as "long" | "short",
    entryPrice: input.entryPrice,
    exitPrice: input.exitPrice,
    stopLoss: input.stopLoss,
    takeProfit: input.takeProfit,
    marketContext: input.marketContext,
    triggerText: input.triggerText,
    entryText: input.entryText,
    riskText: input.riskText,
    exitText: input.exitText,
    notes: input.notes,
    sample: input.sample
      ? {
          id: input.sample.id,
          settledAt: input.sample.settledAt.toISOString(),
          entryPrice: input.sample.entryPrice,
          exitPrice: input.sample.exitPrice,
          pnlValue: input.sample.pnlValue,
          pnlPercent: input.sample.pnlPercent,
          holdingMinutes: input.sample.holdingMinutes,
          maxDrawdownPercent: input.sample.maxDrawdownPercent,
          resultTag: input.sample.resultTag,
          notes: input.sample.notes,
        }
      : null,
  };
}

function serializeRecord(input: {
  id: string;
  traderId: string;
  symbol: string;
  timeframe: string | null;
  recordType: string;
  sourceType: string;
  occurredAt: Date;
  rawContent: string;
  notes: string | null;
  trader: {
    id: string;
    name: string;
    platform: string | null;
    notes: string | null;
  };
  executionPlans: Array<Parameters<typeof serializePlan>[0]>;
}): ResearchDeskRecord {
  return {
    id: input.id,
    traderId: input.traderId,
    symbol: input.symbol as ResearchDeskSymbol,
    timeframe: input.timeframe,
    recordType: input.recordType as "trade" | "view",
    sourceType: input.sourceType,
    occurredAt: input.occurredAt.toISOString(),
    rawContent: input.rawContent,
    notes: input.notes,
    trader: serializeTrader(input.trader),
    executionPlans: input.executionPlans.map(serializePlan),
  };
}

export async function listSerializedStrategyCandidates() {
  const candidates = await db.strategyCandidate.findMany({
    include: {
      samples: {
        include: {
          sample: {
            include: {
              plan: {
                include: {
                  record: {
                    include: {
                      trader: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ sampleCount: "desc" }, { updatedAt: "desc" }],
    take: 20,
  });

  return candidates.map((candidate) => ({
    id: candidate.id,
    marketContext: candidate.marketContext,
    triggerText: candidate.triggerText,
    entryText: candidate.entryText,
    riskText: candidate.riskText,
    exitText: candidate.exitText,
    sampleCount: candidate.sampleCount,
    winRate: candidate.winRate,
    sampleRefs: candidate.samples.map((link) => ({
      sampleId: link.sample.id,
      recordId: link.sample.plan.record.id,
      traderName: link.sample.plan.record.trader.name,
      rawContent: link.sample.plan.record.rawContent,
    })),
  }));
}

export async function loadResearchDeskPayload(input: {
  symbol: ResearchDeskSymbol;
  timeframe: ResearchDeskTimeframe;
}): Promise<ResearchDeskPayload> {
  const [traders, records, candidates, candles, outcomes] = await Promise.all([
    db.traderProfile.findMany({
      orderBy: { name: "asc" },
    }),
    db.traderRecord.findMany({
      include: {
        trader: true,
        executionPlans: {
          include: {
            sample: true,
          },
        },
      },
      orderBy: { occurredAt: "desc" },
      take: 20,
    }),
    listSerializedStrategyCandidates(),
    candleRepository.listCandles({
      symbol: input.symbol,
      timeframe: input.timeframe,
    }),
    listSliceOutcomesSafely({
      symbol: input.symbol,
      timeframe: input.timeframe,
    }),
  ]);

  const serializedRecords = records.map(serializeRecord);
  const serializedOutcomes = outcomes.map(serializeOutcome);

  return {
    selection: input,
    traders: traders.map(serializeTrader),
    records: serializedRecords,
    selectedRecordId: serializedRecords[0]?.id ?? null,
    selectedOutcomeId: serializedOutcomes[0]?.id ?? null,
    candidates,
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
