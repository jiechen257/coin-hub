import { z } from "zod";
import { recordMorphologySchema } from "@/modules/records/record-morphology";

const priceSchema = z.number().nonnegative();

export const executionPlanInputSchema = z.object({
  label: z.string().min(1),
  side: z.enum(["long", "short"]),
  entryPrice: priceSchema.optional(),
  exitPrice: priceSchema.optional(),
  stopLoss: priceSchema.optional(),
  takeProfit: priceSchema.optional(),
  marketContext: z.string().min(1).optional(),
  triggerText: z.string().min(1),
  entryText: z.string().min(1),
  riskText: z.string().min(1).optional(),
  exitText: z.string().min(1).optional(),
  notes: z.string().min(1).optional(),
});

const tradeExecutionInputSchema = executionPlanInputSchema.omit({ label: true });
const updateExecutionPlanInputSchema = executionPlanInputSchema.extend({
  id: z.string().min(1).optional(),
});
const updateTradeExecutionInputSchema = tradeExecutionInputSchema.extend({
  id: z.string().min(1).optional(),
});

const recordBaseFields = {
  traderId: z.string().min(1),
  symbol: z.enum(["BTC", "ETH"]),
  sourceType: z.enum([
    "manual",
    "twitter",
    "telegram",
    "discord",
    "custom-import",
  ]),
  occurredAt: z.string().datetime().optional(),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional(),
  morphology: recordMorphologySchema.optional(),
  rawContent: z.string().min(1),
  notes: z.string().min(1).optional(),
};

function applyRecordTimeRange<T extends z.ZodTypeAny>(schema: T) {
  return schema
    .superRefine((input: any, ctx) => {
      const hasStartedAt = typeof input.startedAt === "string";
      const hasEndedAt = typeof input.endedAt === "string";
      const hasOccurredAt = typeof input.occurredAt === "string";

      if (!hasOccurredAt && !hasStartedAt && !hasEndedAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["startedAt"],
          message: "记录开始时间不能为空",
        });
        return;
      }

      if (hasStartedAt !== hasEndedAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [hasStartedAt ? "endedAt" : "startedAt"],
          message: "记录区间需要同时填写开始和结束时间",
        });
      }

      if (hasStartedAt && hasEndedAt) {
        const startedAtMs = new Date(input.startedAt as string).getTime();
        const endedAtMs = new Date(input.endedAt as string).getTime();

        if (endedAtMs < startedAtMs) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["endedAt"],
            message: "结束时间不能早于开始时间",
          });
        }
      }

      if (hasOccurredAt && hasStartedAt && input.occurredAt !== input.startedAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["startedAt"],
          message: "记录起点需与 occurredAt 保持一致",
        });
      }
    })
    .transform((input: any) => {
      const startedAt = input.startedAt ?? input.occurredAt ?? "";
      const endedAt = input.endedAt ?? input.occurredAt ?? startedAt;

      return {
        ...input,
        occurredAt: startedAt,
        startedAt,
        endedAt,
      };
    });
}

const createTradeRecordSchema = z
  .object({
    ...recordBaseFields,
    recordType: z.literal("trade"),
    trade: tradeExecutionInputSchema,
    plans: z.array(executionPlanInputSchema).max(0).default([]),
  })
  .strict();

const createViewRecordSchema = z
  .object({
    ...recordBaseFields,
    recordType: z.literal("view"),
    plans: z.array(executionPlanInputSchema).min(1),
    trade: z.never().optional(),
  })
  .strict();

export const createRecordSchema = applyRecordTimeRange(
  z.discriminatedUnion("recordType", [
    createTradeRecordSchema,
    createViewRecordSchema,
  ]),
);

const updateTradeRecordSchema = z
  .object({
    ...recordBaseFields,
    recordType: z.literal("trade"),
    trade: updateTradeExecutionInputSchema,
    plans: z.array(updateExecutionPlanInputSchema).max(0).default([]),
  })
  .strict();

const updateViewRecordSchema = z
  .object({
    ...recordBaseFields,
    recordType: z.literal("view"),
    plans: z.array(updateExecutionPlanInputSchema).min(1),
    trade: z.never().optional(),
  })
  .strict();

export const updateRecordSchema = applyRecordTimeRange(
  z.discriminatedUnion("recordType", [
    updateTradeRecordSchema,
    updateViewRecordSchema,
  ]),
);
