import { db } from "@/lib/db";

type SettlementCandle = {
  openTime: Date;
  low: number;
  high: number;
  open: number;
  close: number;
};

type SettleExecutionPlanArgs = {
  planId: string;
  entryPrice: number;
  exitPrice: number;
  settledAt: string;
  candleSeries: SettlementCandle[];
  side: "long" | "short";
  notes?: string;
};

function round(value: number) {
  return Math.trunc(value * 10_000) / 10_000;
}

export async function settleExecutionPlan(input: SettleExecutionPlanArgs) {
  const direction = input.side === "long" ? 1 : -1;
  const pnlValue = round((input.exitPrice - input.entryPrice) * direction);
  const pnlPercent = round((pnlValue / input.entryPrice) * 100);
  const startTime = input.candleSeries[0]?.openTime ?? new Date(input.settledAt);
  const settledAt = new Date(input.settledAt);
  const holdingMinutes = Math.round(
    (settledAt.getTime() - startTime.getTime()) / 60_000,
  );
  const maxDrawdownPercent = round(
    Math.min(
      0,
      ...input.candleSeries.map((candle) =>
        input.side === "long"
          ? ((candle.low - input.entryPrice) / input.entryPrice) * 100
          : ((input.entryPrice - candle.high) / input.entryPrice) * 100,
      ),
    ),
  );
  const resultTag = pnlValue > 0 ? "win" : pnlValue < 0 ? "loss" : "flat";

  return db.tradeSample.upsert({
    where: { planId: input.planId },
    create: {
      planId: input.planId,
      settledAt,
      entryPrice: input.entryPrice,
      exitPrice: input.exitPrice,
      pnlValue,
      pnlPercent,
      holdingMinutes,
      maxDrawdownPercent,
      resultTag,
      notes: input.notes,
    },
    update: {
      settledAt,
      entryPrice: input.entryPrice,
      exitPrice: input.exitPrice,
      pnlValue,
      pnlPercent,
      holdingMinutes,
      maxDrawdownPercent,
      resultTag,
      notes: input.notes,
    },
  });
}
