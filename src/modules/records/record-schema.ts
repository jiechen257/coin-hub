import { z } from "zod";

export const executionPlanInputSchema = z.object({
  label: z.string().min(1),
  side: z.enum(["long", "short"]),
  entryPrice: z.number().positive().optional(),
  exitPrice: z.number().positive().optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  marketContext: z.string().min(1).optional(),
  triggerText: z.string().min(1),
  entryText: z.string().min(1),
  riskText: z.string().min(1).optional(),
  exitText: z.string().min(1).optional(),
  notes: z.string().min(1).optional(),
});

const tradeExecutionInputSchema = executionPlanInputSchema.omit({ label: true });

export const createRecordSchema = z.object({
  traderId: z.string().min(1),
  symbol: z.enum(["BTC", "ETH"]),
  recordType: z.enum(["trade", "view"]),
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
  trade: tradeExecutionInputSchema.optional(),
  plans: z.array(executionPlanInputSchema).default([]),
});
