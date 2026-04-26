import type {
  ResearchDeskPlan,
  ResearchDeskRecord,
  ResearchDeskSourceType,
  ResearchDeskTrader,
} from "@/components/research-desk/research-desk-types";
import { parseStoredRecordMorphology } from "@/modules/records/record-morphology";
import {
  buildRecordCompletion,
  normalizeRecordStatus,
} from "@/modules/records/record-status";

function normalizeSourceType(input: string): ResearchDeskSourceType {
  switch (input) {
    case "twitter":
    case "telegram":
    case "discord":
    case "custom-import":
      return input;
    default:
      return "manual";
  }
}

export function serializeTrader(input: {
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

export function serializePlan(input: {
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

export function serializeRecord(input: {
  id: string;
  traderId: string;
  symbol: string;
  timeframe: string | null;
  recordType: string;
  status?: string | null;
  sourceType: string;
  occurredAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
  archivedAt?: Date | null;
  archiveSummary?: string | null;
  morphology: string | null;
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
  const startedAt = input.startedAt ?? input.occurredAt;
  const endedAt = input.endedAt ?? startedAt;
  const status = normalizeRecordStatus(input.status, input.archivedAt);
  const executionPlans = input.executionPlans.map(serializePlan);
  const record = {
    id: input.id,
    traderId: input.traderId,
    symbol: input.symbol as ResearchDeskRecord["symbol"],
    timeframe: input.timeframe,
    recordType: input.recordType as ResearchDeskRecord["recordType"],
    status,
    sourceType: normalizeSourceType(input.sourceType),
    occurredAt: startedAt.toISOString(),
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    archivedAt: input.archivedAt?.toISOString() ?? null,
    archiveSummary: input.archiveSummary ?? null,
    morphology: parseStoredRecordMorphology(input.morphology),
    rawContent: input.rawContent,
    notes: input.notes,
    trader: serializeTrader(input.trader),
    executionPlans,
  };

  return {
    ...record,
    completion: buildRecordCompletion(record),
  };
}
