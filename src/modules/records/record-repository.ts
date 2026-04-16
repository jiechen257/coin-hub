import { db } from "@/lib/db";

type CreateRecordInput = {
  traderId: string;
  symbol: "BTC" | "ETH";
  timeframe?: string;
  recordType: "trade" | "view";
  sourceType: "manual" | "twitter" | "telegram" | "discord" | "custom-import";
  occurredAt: Date;
  rawContent: string;
  notes?: string;
  plans: Array<{
    label: string;
    side: "long" | "short";
    entryPrice?: number;
    exitPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    marketContext?: string;
    triggerText: string;
    entryText: string;
    riskText?: string;
    exitText?: string;
    notes?: string;
  }>;
};

function derivePlanStatus(plan: CreateRecordInput["plans"][number]) {
  return plan.entryPrice !== undefined && plan.exitPrice !== undefined
    ? "ready"
    : "draft";
}

export async function createTraderRecord(input: CreateRecordInput) {
  return db.traderRecord.create({
    data: {
      traderId: input.traderId,
      symbol: input.symbol,
      timeframe: input.timeframe,
      recordType: input.recordType,
      sourceType: input.sourceType,
      occurredAt: input.occurredAt,
      rawContent: input.rawContent,
      notes: input.notes,
      executionPlans: {
        create: input.plans.map((plan) => ({
          ...plan,
          status: derivePlanStatus(plan),
        })),
      },
    },
    include: { executionPlans: true },
  });
}
