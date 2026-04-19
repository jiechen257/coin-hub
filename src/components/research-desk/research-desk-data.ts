import type {
  ResearchDeskPayload,
  ResearchDeskPlan,
  ResearchDeskRecord,
  ResearchDeskTrader,
} from "@/components/research-desk/research-desk-types";
import {
  loadResearchDeskChartSlice,
} from "@/components/research-desk/research-desk-chart-slice";
import type {
  ResearchDeskSymbol,
  ResearchDeskTimeframe,
} from "@/components/research-desk/research-desk-types";

function prepareResearchDeskLoaderEnv() {
  if (process.env.VITEST) {
    process.env.TURSO_DATABASE_URL = "";
    process.env.TURSO_AUTH_TOKEN = "";
  }
}

async function getResearchDeskDb() {
  prepareResearchDeskLoaderEnv();
  const { db } = await import("@/lib/db");
  return db;
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
  const db = await getResearchDeskDb();
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
  const db = await getResearchDeskDb();
  const [traders, records, candidates, chartSlice] = await Promise.all([
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
    loadResearchDeskChartSlice(input),
  ]);

  const serializedRecords = records.map(serializeRecord);

  return {
    ...chartSlice,
    traders: traders.map(serializeTrader),
    records: serializedRecords,
    selectedRecordId: serializedRecords[0]?.id ?? null,
    candidates,
  };
}
