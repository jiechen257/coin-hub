import { z } from "zod";

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

const createRecordBaseSchema = {
  traderId: z.string().min(1),
  symbol: z.enum(["BTC", "ETH"]),
  sourceType: z.enum([
    "manual",
    "twitter",
    "telegram",
    "discord",
    "custom-import",
  ]),
  occurredAt: z.string().datetime(),
  rawContent: z.string().min(1),
  notes: z.string().min(1).optional(),
};

const createTradeRecordSchema = z
  .object({
    ...createRecordBaseSchema,
    recordType: z.literal("trade"),
    trade: tradeExecutionInputSchema,
    plans: z.array(executionPlanInputSchema).max(0).default([]),
  })
  .strict();

const createViewRecordSchema = z
  .object({
    ...createRecordBaseSchema,
    recordType: z.literal("view"),
    plans: z.array(executionPlanInputSchema).min(1),
    trade: z.never().optional(),
  })
  .strict();

export const createRecordSchema = z.discriminatedUnion("recordType", [
  createTradeRecordSchema,
  createViewRecordSchema,
]);
