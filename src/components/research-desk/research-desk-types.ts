import type { RecordMorphology } from "@/modules/records/record-morphology";

export type ResearchDeskSymbol = "BTC" | "ETH";
export type ResearchDeskTimeframe = "15m" | "1h" | "4h" | "1d";
export type ResearchDeskOutcomeResultLabel = "good" | "neutral" | "bad" | "pending";
export type ResearchDeskOutcomeSubjectType = "record" | "plan";
export type ResearchDeskReviewTagKind = "preset" | "custom";
export type ResearchDeskResultFilter = "all" | "good" | "neutral" | "bad";
export type ResearchDeskReviewTagFilter = string | null;
export type ResearchDeskRecordStatus =
  | "not_started"
  | "in_progress"
  | "ended"
  | "archived";
export type ResearchDeskSourceType =
  | "manual"
  | "twitter"
  | "telegram"
  | "discord"
  | "custom-import";

export type ResearchDeskOutcome = {
  id: string;
  subjectType: ResearchDeskOutcomeSubjectType;
  subjectId: string;
  recordId: string | null;
  planId: string | null;
  symbol: ResearchDeskSymbol;
  timeframe: ResearchDeskTimeframe;
  windowType: string;
  windowStartAt: string;
  windowEndAt: string;
  resultLabel: ResearchDeskOutcomeResultLabel;
  resultReason: string;
  forwardReturnPercent: number | null;
  maxFavorableExcursionPercent: number | null;
  maxAdverseExcursionPercent: number | null;
  ruleVersion: string;
  computedAt: string;
  reviewTags: string[];
};

export type ResearchDeskReviewTagOption = {
  label: string;
  kind: ResearchDeskReviewTagKind;
};

export type ResearchDeskOutcomeCounts = Record<
  ResearchDeskOutcomeResultLabel,
  number
> & {
  total: number;
};

export type ResearchDeskOutcomeAggregates = {
  counts: ResearchDeskOutcomeCounts;
  reviewTags: Array<{
    label: string;
    count: number;
    kind: ResearchDeskReviewTagKind;
  }>;
};

export type ResearchDeskTrader = {
  id: string;
  name: string;
  platform: string | null;
  notes: string | null;
};

export type ResearchDeskSample = {
  id: string;
  settledAt: string;
  entryPrice: number;
  exitPrice: number;
  pnlValue: number;
  pnlPercent: number;
  holdingMinutes: number;
  maxDrawdownPercent: number | null;
  resultTag: string;
  notes: string | null;
};

export type ResearchDeskPlan = {
  id: string;
  label: string;
  status: string;
  side: "long" | "short";
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
  sample: ResearchDeskSample | null;
};

export type ResearchDeskRecordCompletion = {
  missingBasics: string[];
  missingPlans: string[];
  missingReview: string[];
  score: number;
};

export type ResearchDeskRecord = {
  id: string;
  traderId: string;
  symbol: ResearchDeskSymbol;
  timeframe: string | null;
  recordType: "trade" | "view";
  status: ResearchDeskRecordStatus;
  sourceType: ResearchDeskSourceType;
  occurredAt: string;
  startedAt?: string;
  endedAt?: string;
  archivedAt: string | null;
  archiveSummary: string | null;
  completion: ResearchDeskRecordCompletion;
  morphology?: RecordMorphology | null;
  rawContent: string;
  notes: string | null;
  trader: ResearchDeskTrader;
  executionPlans: ResearchDeskPlan[];
};

export type ResearchDeskCandidateSampleRef = {
  sampleId: string;
  recordId: string;
  traderName: string;
  rawContent: string;
};

export type ResearchDeskCandidate = {
  id: string;
  marketContext: string | null;
  triggerText: string;
  entryText: string;
  riskText: string | null;
  exitText: string | null;
  sampleCount: number;
  winRate: number;
  sampleRefs: ResearchDeskCandidateSampleRef[];
};

export type ResearchDeskCandle = {
  openTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

export type ResearchDeskMarker = {
  time: string;
  position: "aboveBar" | "belowBar" | "inBar";
  label: string;
  text: string;
  previewText?: string;
  detailText?: string;
  tone: "bullish" | "bearish" | "neutral";
};

export type ResearchDeskSelection = {
  symbol: ResearchDeskSymbol;
  timeframe: ResearchDeskTimeframe;
};

export type ResearchDeskChartSlicePayload = {
  selection: ResearchDeskSelection;
  selectedOutcomeId: string | null;
  reviewTagOptions: ResearchDeskReviewTagOption[];
  summary: ResearchDeskOutcomeAggregates;
  chart: {
    candles: ResearchDeskCandle[];
    outcomes: ResearchDeskOutcome[];
  };
};

export type ResearchDeskPayload = ResearchDeskChartSlicePayload & {
  traders: ResearchDeskTrader[];
  records: ResearchDeskRecord[];
  selectedRecordId: string | null;
  databaseRuntime: {
    target: "local" | "daily" | "production" | "remote";
    label: string;
    tone: "neutral" | "warning" | "danger";
  };
  candidates: ResearchDeskCandidate[];
};

export type ResearchDeskArchiveStats = {
  recordCount: number;
  summarizedCount: number;
  unsummarizedCount: number;
  goodRate: number | null;
  topReviewTags: Array<{
    label: string;
    count: number;
  }>;
};

export type ResearchDeskArchivePayload = {
  selection: ResearchDeskSelection;
  records: ResearchDeskRecord[];
  selectedRecordId: string | null;
  reviewTagOptions: ResearchDeskReviewTagOption[];
  summary: ResearchDeskOutcomeAggregates;
  archiveStats: ResearchDeskArchiveStats;
  chart: {
    candles: ResearchDeskCandle[];
    outcomes: ResearchDeskOutcome[];
  };
};

export function buildRecordMarkers(
  records: ResearchDeskRecord[],
  symbol: ResearchDeskSymbol,
): ResearchDeskMarker[] {
  return records
    .filter((record) => record.symbol === symbol)
    .map((record) => {
      const startedAt = record.startedAt ?? record.occurredAt;
      const firstPlan = record.executionPlans[0];
      const tone =
        firstPlan?.side === "long"
          ? "bullish"
          : firstPlan?.side === "short"
            ? "bearish"
            : "neutral";
      const position = tone === "bearish" ? "aboveBar" : "belowBar";

      return {
        time: startedAt,
        position,
        label:
          record.recordType === "trade"
            ? firstPlan?.side === "short"
              ? "空"
              : "多"
            : "观",
        text: `${record.trader.name} · ${record.rawContent}`,
        previewText:
          record.notes ??
          firstPlan?.triggerText ??
          `${record.trader.name} · ${record.rawContent}`,
        detailText: record.rawContent,
        tone,
      };
    });
}
