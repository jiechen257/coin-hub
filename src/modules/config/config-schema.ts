import { z } from "zod";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

// Keep the first persisted config intentionally small while ensuring any
// future extension fields remain valid JSON for Prisma persistence.
export const configSchema = z
  .object({
    riskPct: z.number().positive(),
  })
  .catchall(jsonValueSchema);

export type ConfigInput = z.infer<typeof configSchema>;
