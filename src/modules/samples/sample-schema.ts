import { z } from "zod";

const priceSchema = z.number().nonnegative();

export const settleExecutionPlanInputSchema = z
  .object({
    entryPrice: priceSchema,
    exitPrice: priceSchema,
    settledAt: z.string().datetime(),
    notes: z.string().min(1).optional(),
  })
  .strict();

export type SettleExecutionPlanInput = z.infer<typeof settleExecutionPlanInputSchema>;
