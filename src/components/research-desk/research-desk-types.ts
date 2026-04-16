export type ResearchDeskSymbol = "BTC" | "ETH";
export type ResearchDeskTimeframe = "15m" | "1h" | "4h" | "1d";

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

export type ResearchDeskRecord = {
  id: string;
  traderId: string;
  symbol: ResearchDeskSymbol;
  timeframe: string | null;
  recordType: "trade" | "view";
  sourceType: string;
  occurredAt: string;
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

export type ResearchDeskPayload = {
  selection: {
    symbol: ResearchDeskSymbol;
    timeframe: ResearchDeskTimeframe;
  };
  traders: ResearchDeskTrader[];
  records: ResearchDeskRecord[];
  selectedRecordId: string | null;
  candidates: ResearchDeskCandidate[];
  chart: {
    candles: ResearchDeskCandle[];
  };
};

export function buildRecordMarkers(
  records: ResearchDeskRecord[],
  symbol: ResearchDeskSymbol,
): ResearchDeskMarker[] {
  return records
    .filter((record) => record.symbol === symbol)
    .map((record) => {
      const firstPlan = record.executionPlans[0];
      const tone =
        firstPlan?.side === "long"
          ? "bullish"
          : firstPlan?.side === "short"
            ? "bearish"
            : "neutral";
      const position = tone === "bearish" ? "aboveBar" : "belowBar";

      return {
        time: record.occurredAt,
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
