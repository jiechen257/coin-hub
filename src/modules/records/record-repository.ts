import { db } from "@/lib/db";
import {
  serializeRecordMorphology,
  type RecordMorphology,
} from "@/modules/records/record-morphology";

export type ExecutionPlanInput = {
  id?: string;
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
};

export type CreateRecordInput = {
  traderId: string;
  symbol: "BTC" | "ETH";
  timeframe?: string;
  recordType: "trade" | "view";
  sourceType: "manual" | "twitter" | "telegram" | "discord" | "custom-import";
  startedAt: Date;
  endedAt: Date;
  morphology?: RecordMorphology;
  rawContent: string;
  notes?: string;
  plans: ExecutionPlanInput[];
};

export class TraderRecordNotFoundError extends Error {
  readonly recordId: string;

  constructor(recordId: string) {
    super(`Trader record ${recordId} does not exist.`);
    this.name = "TraderRecordNotFoundError";
    this.recordId = recordId;
  }
}

export class TraderRecordMutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TraderRecordMutationError";
  }
}

function derivePlanStatus(plan: ExecutionPlanInput) {
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
      occurredAt: input.startedAt,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      morphology: serializeRecordMorphology(input.morphology),
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

export async function updateTraderRecord(recordId: string, input: CreateRecordInput) {
  return db.$transaction(async (tx) => {
    const existingRecord = await tx.traderRecord.findUnique({
      where: { id: recordId },
      include: {
        executionPlans: {
          include: {
            sample: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!existingRecord || existingRecord.archivedAt) {
      throw new TraderRecordNotFoundError(recordId);
    }

    if (existingRecord.recordType !== input.recordType) {
      throw new TraderRecordMutationError("记录类型暂不支持在编辑时切换");
    }

    const existingPlansById = new Map(
      existingRecord.executionPlans.map((plan) => [plan.id, plan]),
    );
    const nextPlanIds = new Set(
      input.plans.flatMap((plan) => (plan.id ? [plan.id] : [])),
    );
    const removedPlans = existingRecord.executionPlans.filter(
      (plan) => !nextPlanIds.has(plan.id),
    );

    if (removedPlans.some((plan) => plan.sample)) {
      throw new TraderRecordMutationError("已结算方案不能删除，请先保留该方案");
    }

    await tx.traderRecord.update({
      where: { id: recordId },
      data: {
        traderId: input.traderId,
        symbol: input.symbol,
        timeframe: input.timeframe,
        sourceType: input.sourceType,
        occurredAt: input.startedAt,
        startedAt: input.startedAt,
        endedAt: input.endedAt,
        morphology: serializeRecordMorphology(input.morphology),
        rawContent: input.rawContent,
        notes: input.notes,
      },
    });

    if (removedPlans.length > 0) {
      await tx.executionPlan.deleteMany({
        where: {
          id: {
            in: removedPlans.map((plan) => plan.id),
          },
        },
      });
    }

    for (const plan of input.plans) {
      if (plan.id) {
        const existingPlan = existingPlansById.get(plan.id);

        if (!existingPlan || existingPlan.recordId !== recordId) {
          throw new TraderRecordMutationError("存在不属于当前记录的方案");
        }

        await tx.executionPlan.update({
          where: { id: plan.id },
          data: {
            label: plan.label,
            side: plan.side,
            entryPrice: plan.entryPrice,
            exitPrice: plan.exitPrice,
            stopLoss: plan.stopLoss,
            takeProfit: plan.takeProfit,
            marketContext: plan.marketContext,
            triggerText: plan.triggerText,
            entryText: plan.entryText,
            riskText: plan.riskText,
            exitText: plan.exitText,
            notes: plan.notes,
            status: existingPlan.sample ? existingPlan.status : derivePlanStatus(plan),
          },
        });
        continue;
      }

      await tx.executionPlan.create({
        data: {
          recordId,
          label: plan.label,
          side: plan.side,
          entryPrice: plan.entryPrice,
          exitPrice: plan.exitPrice,
          stopLoss: plan.stopLoss,
          takeProfit: plan.takeProfit,
          marketContext: plan.marketContext,
          triggerText: plan.triggerText,
          entryText: plan.entryText,
          riskText: plan.riskText,
          exitText: plan.exitText,
          notes: plan.notes,
          status: derivePlanStatus(plan),
        },
      });
    }

    return tx.traderRecord.findUniqueOrThrow({
      where: { id: recordId },
      include: {
        trader: true,
        executionPlans: {
          include: {
            sample: true,
          },
        },
      },
    });
  });
}

export async function archiveTraderRecord(recordId: string) {
  const record = await db.traderRecord.findUnique({
    where: { id: recordId },
    select: {
      id: true,
      archivedAt: true,
    },
  });

  if (!record || record.archivedAt) {
    throw new TraderRecordNotFoundError(recordId);
  }

  return db.traderRecord.update({
    where: { id: recordId },
    data: {
      archivedAt: new Date(),
    },
  });
}
