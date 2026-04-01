import { z } from "zod";

// Keep the first persisted config intentionally small; later tasks can extend it.
export const configSchema = z
  .object({
    riskPct: z.number().positive(),
  })
  .passthrough();

export type ConfigInput = z.infer<typeof configSchema>;
