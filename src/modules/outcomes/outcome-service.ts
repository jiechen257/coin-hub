import { db } from "@/lib/db";
import { candleRepository } from "@/modules/market-data/candle-repository";
import type { CandleTimeframe } from "@/modules/market-data/normalize-candles";
import {
  getOutcomeProfile,
  OUTCOME_RULE_VERSION,
  type OutcomeRecordType,
} from "@/modules/outcomes/outcome-profile";
import {
  outcomeRepository,
  type UpsertRecordOutcomeInput,
} from "@/modules/outcomes/outcome-repository";

type OutcomePlanSide = "long" | "short";

type OutcomePlan = {
  id: string;
  side: OutcomePlanSide;
  triggerText: string;
  entryText: string;
};

type OutcomeRecord = {
  id: string;
  recordType: OutcomeRecordType;
  symbol: string;
  occurredAt: Date;
  executionPlans: OutcomePlan[];
};

type OutcomeCandle = {
  openTime: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

type OutcomeMetrics = {
  forwardReturnPercent: number | null;
  mfePercent: number | null;
  maePercent: number | null;
};

type SyncRecordOutcomesInput = {
  record: OutcomeRecord;
  timeframe: CandleTimeframe;
  candles: OutcomeCandle[];
};

const WINDOW_TYPE_BY_RECORD_TYPE = {
  trade: "trade-follow-through",
  view: "plan-follow-through",
} as const;

const TIMEFRAME_MS_MAP: Record<CandleTimeframe, number> = {
  "15m": 15 * 60 * 1_000,
  "1h": 60 * 60 * 1_000,
  "4h": 4 * 60 * 60 * 1_000,
  "1d": 24 * 60 * 60 * 1_000,
};

function roundPercent(value: number) {
  return Math.trunc(value * 10_000) / 10_000;
}

function getTimeframeMs(timeframe: CandleTimeframe) {
  return TIMEFRAME_MS_MAP[timeframe];
}

function isOutcomeRecordType(value: string): value is OutcomeRecordType {
  return value === "trade" || value === "view";
}

function isOutcomePlanSide(value: string): value is OutcomePlanSide {
  return value === "long" || value === "short";
}

function toSortedCandles(candles: OutcomeCandle[]) {
  return [...candles].sort(
    (left, right) => left.openTime.getTime() - right.openTime.getTime(),
  );
}

function findNearestCandleIndex(candles: OutcomeCandle[], targetTime: Date) {
  const targetTimeMs = targetTime.getTime();
  let nearestIndex = -1;
  let nearestDistance = Number.POSITIVE_INFINITY;

  candles.forEach((candle, index) => {
    const distance = Math.abs(candle.openTime.getTime() - targetTimeMs);

    if (distance < nearestDistance) {
      nearestIndex = index;
      nearestDistance = distance;
      return;
    }

    if (
      distance === nearestDistance &&
      nearestIndex >= 0 &&
      candle.openTime.getTime() < candles[nearestIndex].openTime.getTime()
    ) {
      nearestIndex = index;
    }
  });

  return nearestIndex;
}

function buildPendingMetrics(): OutcomeMetrics {
  return {
    forwardReturnPercent: null,
    mfePercent: null,
    maePercent: null,
  };
}

function toDirectionalPercent(side: OutcomePlanSide, referencePrice: number, price: number) {
  const direction = side === "long" ? 1 : -1;
  return roundPercent((((price - referencePrice) / referencePrice) * 100) * direction);
}

function buildOutcomeMetrics(args: {
  side: OutcomePlanSide;
  referencePrice: number;
  candles: OutcomeCandle[];
}) {
  const { side, referencePrice, candles } = args;
  const lastCandle = candles[candles.length - 1];

  if (!lastCandle) {
    return buildPendingMetrics();
  }

  return {
    forwardReturnPercent: toDirectionalPercent(side, referencePrice, lastCandle.close),
    mfePercent: candles.reduce((currentMax, candle) => {
      const favorablePrice = side === "long" ? candle.high : candle.low;
      return Math.max(
        currentMax,
        toDirectionalPercent(side, referencePrice, favorablePrice),
      );
    }, Number.NEGATIVE_INFINITY),
    maePercent: candles.reduce((currentMin, candle) => {
      const adversePrice = side === "long" ? candle.low : candle.high;
      return Math.min(
        currentMin,
        toDirectionalPercent(side, referencePrice, adversePrice),
      );
    }, Number.POSITIVE_INFINITY),
  };
}

function findFirstThresholdHit(args: {
  candles: OutcomeCandle[];
  side: OutcomePlanSide;
  referencePrice: number;
  favorablePct: number;
  adversePct: number;
}) {
  let favorableHitIndex: number | null = null;
  let adverseHitIndex: number | null = null;

  args.candles.forEach((candle, index) => {
    if (favorableHitIndex === null) {
      const favorablePrice = args.side === "long" ? candle.high : candle.low;
      const favorablePercent = toDirectionalPercent(
        args.side,
        args.referencePrice,
        favorablePrice,
      );

      if (favorablePercent >= args.favorablePct) {
        favorableHitIndex = index;
      }
    }

    if (adverseHitIndex === null) {
      const adversePrice = args.side === "long" ? candle.low : candle.high;
      const adversePercent = toDirectionalPercent(
        args.side,
        args.referencePrice,
        adversePrice,
      );

      if (adversePercent <= args.adversePct) {
        adverseHitIndex = index;
      }
    }
  });

  return {
    favorableHitIndex,
    adverseHitIndex,
  };
}

function pickOutcomeLabel(metrics: {
  forwardReturnPercent: number | null;
  mfePercent: number | null;
  maePercent: number | null;
  favorablePct: number;
  adversePct: number;
}) {
  if (metrics.mfePercent === null || metrics.maePercent === null) {
    return "pending" as const;
  }

  if (
    metrics.mfePercent >= metrics.favorablePct &&
    metrics.maePercent > metrics.adversePct
  ) {
    return "good" as const;
  }

  if (metrics.maePercent <= metrics.adversePct) {
    return "bad" as const;
  }

  return "neutral" as const;
}

function resolveOutcomeLabel(args: {
  metrics: OutcomeMetrics;
  favorableHitIndex: number | null;
  adverseHitIndex: number | null;
  windowComplete: boolean;
  favorablePct: number;
  adversePct: number;
}) {
  if (
    args.favorableHitIndex !== null &&
    (args.adverseHitIndex === null || args.favorableHitIndex <= args.adverseHitIndex)
  ) {
    return "good" as const;
  }

  if (args.adverseHitIndex !== null) {
    return "bad" as const;
  }

  if (!args.windowComplete) {
    return "pending" as const;
  }

  return pickOutcomeLabel({
    ...args.metrics,
    favorablePct: args.favorablePct,
    adversePct: args.adversePct,
  });
}

function buildResultReason(args: {
  resultLabel: "good" | "neutral" | "bad" | "pending";
  aligned: boolean;
}) {
  const alignmentSuffix = args.aligned ? "；时间已对齐到最近K线" : "";

  if (args.resultLabel === "good") {
    return `观察窗口内先命中顺向阈值${alignmentSuffix}`;
  }

  if (args.resultLabel === "bad") {
    return `观察窗口内先命中逆向阈值${alignmentSuffix}`;
  }

  if (args.resultLabel === "neutral") {
    return `观察窗口补齐，顺向与逆向阈值都未触发${alignmentSuffix}`;
  }

  return `观察窗口未补齐，结果待定${alignmentSuffix}`;
}

function buildOutcomeSubjects(record: OutcomeRecord) {
  if (record.recordType === "trade") {
    const primaryPlan = record.executionPlans.find((plan) => isOutcomePlanSide(plan.side));

    if (!primaryPlan) {
      return [];
    }

    return [
      {
        subjectType: "record" as const,
        subjectId: record.id,
        side: primaryPlan.side,
      },
    ];
  }

  return record.executionPlans
    .filter((plan) => isOutcomePlanSide(plan.side))
    .map((plan) => ({
      subjectType: "plan" as const,
      subjectId: plan.id,
      side: plan.side,
    }));
}

function computeSingleOutcome(args: {
  record: OutcomeRecord;
  timeframe: CandleTimeframe;
  subjectType: UpsertRecordOutcomeInput["subjectType"];
  subjectId: string;
  side: OutcomePlanSide;
  candles: OutcomeCandle[];
}) {
  const profile = getOutcomeProfile(args.record.recordType, args.timeframe);
  const sortedCandles = toSortedCandles(args.candles);
  const alignedIndex = findNearestCandleIndex(sortedCandles, args.record.occurredAt);
  const timeframeMs = getTimeframeMs(args.timeframe);
  const alignedCandle = alignedIndex >= 0 ? sortedCandles[alignedIndex] : null;
  const windowStartAt = alignedCandle?.openTime ?? args.record.occurredAt;
  const windowEndAt = new Date(
    windowStartAt.getTime() + timeframeMs * profile.windowCandles,
  );
  const aligned = alignedCandle
    ? alignedCandle.openTime.getTime() !== args.record.occurredAt.getTime()
    : false;

  if (!alignedCandle) {
    return {
      subjectType: args.subjectType,
      subjectId: args.subjectId,
      symbol: args.record.symbol,
      timeframe: args.timeframe,
      windowType: WINDOW_TYPE_BY_RECORD_TYPE[args.record.recordType],
      windowStartAt,
      windowEndAt,
      resultLabel: "pending" as const,
      resultReason: buildResultReason({ resultLabel: "pending", aligned }),
      forwardReturnPercent: null,
      maxFavorableExcursionPercent: null,
      maxAdverseExcursionPercent: null,
      ruleVersion: OUTCOME_RULE_VERSION,
    };
  }

  const windowCandles = sortedCandles.slice(
    alignedIndex,
    alignedIndex + profile.windowCandles,
  );
  const metrics = buildOutcomeMetrics({
    side: args.side,
    referencePrice: alignedCandle.open,
    candles: windowCandles,
  });
  const { favorableHitIndex, adverseHitIndex } = findFirstThresholdHit({
    candles: windowCandles,
    side: args.side,
    referencePrice: alignedCandle.open,
    favorablePct: profile.favorablePct,
    adversePct: profile.adversePct,
  });
  const windowComplete = windowCandles.length >= profile.windowCandles;
  const resultLabel = resolveOutcomeLabel({
    metrics,
    favorableHitIndex,
    adverseHitIndex,
    windowComplete,
    favorablePct: profile.favorablePct,
    adversePct: profile.adversePct,
  });
  const resolvedMetrics =
    resultLabel === "pending" ? buildPendingMetrics() : metrics;

  return {
    subjectType: args.subjectType,
    subjectId: args.subjectId,
    symbol: args.record.symbol,
    timeframe: args.timeframe,
    windowType: WINDOW_TYPE_BY_RECORD_TYPE[args.record.recordType],
    windowStartAt,
    windowEndAt,
    resultLabel,
    resultReason: buildResultReason({ resultLabel, aligned }),
    forwardReturnPercent: resolvedMetrics.forwardReturnPercent,
    maxFavorableExcursionPercent: resolvedMetrics.mfePercent,
    maxAdverseExcursionPercent: resolvedMetrics.maePercent,
    ruleVersion: OUTCOME_RULE_VERSION,
  };
}

export async function syncRecordOutcomes(input: SyncRecordOutcomesInput) {
  return buildOutcomeSubjects(input.record).map((subject) =>
    computeSingleOutcome({
      record: input.record,
      timeframe: input.timeframe,
      candles: input.candles,
      subjectType: subject.subjectType,
      subjectId: subject.subjectId,
      side: subject.side,
    }),
  );
}

export async function syncOutcomesForRecordId(
  recordId: string,
  timeframe: CandleTimeframe = "1h",
) {
  const record = await db.traderRecord.findUnique({
    where: { id: recordId },
    include: {
      executionPlans: {
        select: {
          id: true,
          side: true,
          triggerText: true,
          entryText: true,
        },
      },
    },
  });

  if (!record || !isOutcomeRecordType(record.recordType)) {
    return [];
  }

  const profile = getOutcomeProfile(record.recordType, timeframe);
  const candles = await candleRepository.listCandles({
    symbol: record.symbol,
    timeframe,
    limit: profile.windowCandles + 2,
    fromOpenTime: new Date(record.occurredAt.getTime() - getTimeframeMs(timeframe)),
  });
  const computed = await syncRecordOutcomes({
    record: {
      id: record.id,
      recordType: record.recordType,
      symbol: record.symbol,
      occurredAt: record.occurredAt,
      executionPlans: record.executionPlans.filter((plan) =>
        isOutcomePlanSide(plan.side),
      ),
    },
    timeframe,
    candles,
  });

  return Promise.all(
    computed.map((outcome) => outcomeRepository.upsertRecordOutcome(outcome)),
  );
}
