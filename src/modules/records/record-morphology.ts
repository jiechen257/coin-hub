import { z } from "zod";

const morphologyTimeframeSchema = z.enum(["15m", "1h", "4h", "1d"]);
const morphologyToneSchema = z.enum(["bullish", "bearish", "neutral"]);
const morphologyDirectionSchema = z.enum(["up", "down", "range"]);
const morphologyLabelSchema = z.string().min(1).max(48);
const morphologyNotesSchema = z.string().min(1).max(280);
const morphologyDateTimeSchema = z.string().datetime();
const morphologyPriceSchema = z.number().positive();

function withTimeRangeValidation<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((input: any, ctx) => {
    const startAt = input.startAt ? new Date(input.startAt).getTime() : null;
    const endAt = input.endAt ? new Date(input.endAt).getTime() : null;

    if (startAt !== null && endAt !== null && endAt < startAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endAt"],
        message: "结束时间不能早于开始时间",
      });
    }
  });
}

const trendMorphologyItemSchema = withTimeRangeValidation(
  z
    .object({
      kind: z.literal("trend"),
      label: morphologyLabelSchema,
      timeframe: morphologyTimeframeSchema.optional(),
      direction: morphologyDirectionSchema,
      startAt: morphologyDateTimeSchema,
      endAt: morphologyDateTimeSchema,
      tone: morphologyToneSchema.optional(),
      notes: morphologyNotesSchema.optional(),
    })
    .strict(),
);

const strokeMorphologyBaseSchema = z
  .object({
    label: morphologyLabelSchema,
    timeframe: morphologyTimeframeSchema.optional(),
    startAt: morphologyDateTimeSchema,
    endAt: morphologyDateTimeSchema,
    startPrice: morphologyPriceSchema,
    endPrice: morphologyPriceSchema,
    tone: morphologyToneSchema.optional(),
    notes: morphologyNotesSchema.optional(),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (new Date(input.endAt).getTime() < new Date(input.startAt).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endAt"],
        message: "结束时间不能早于开始时间",
      });
    }
  });

const biMorphologyItemSchema = strokeMorphologyBaseSchema.extend({
  kind: z.literal("bi"),
});

const segmentMorphologyItemSchema = strokeMorphologyBaseSchema.extend({
  kind: z.literal("segment"),
});

const priceZoneMorphologyBaseSchema = z
  .object({
    label: morphologyLabelSchema,
    timeframe: morphologyTimeframeSchema.optional(),
    startAt: morphologyDateTimeSchema,
    endAt: morphologyDateTimeSchema,
    lowPrice: morphologyPriceSchema,
    highPrice: morphologyPriceSchema,
    tone: morphologyToneSchema.optional(),
    notes: morphologyNotesSchema.optional(),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (new Date(input.endAt).getTime() < new Date(input.startAt).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endAt"],
        message: "结束时间不能早于开始时间",
      });
    }

    if (input.highPrice < input.lowPrice) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["highPrice"],
        message: "高点不能低于低点",
      });
    }
  });

const pivotZoneMorphologyItemSchema = priceZoneMorphologyBaseSchema.extend({
  kind: z.literal("pivotZone"),
});

const targetZoneMorphologyItemSchema = priceZoneMorphologyBaseSchema.extend({
  kind: z.literal("targetZone"),
});

const keyLevelMorphologyItemSchema = z
  .object({
    kind: z.literal("keyLevel"),
    label: morphologyLabelSchema,
    timeframe: morphologyTimeframeSchema.optional(),
    price: morphologyPriceSchema,
    startAt: morphologyDateTimeSchema.optional(),
    endAt: morphologyDateTimeSchema.optional(),
    tone: morphologyToneSchema.optional(),
    notes: morphologyNotesSchema.optional(),
  })
  .strict()
  .superRefine((input, ctx) => {
    if ((input.startAt && !input.endAt) || (!input.startAt && input.endAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [input.startAt ? "endAt" : "startAt"],
        message: "关键位时间范围需要同时填写开始和结束时间",
      });
      return;
    }

    if (
      input.startAt &&
      input.endAt &&
      new Date(input.endAt).getTime() < new Date(input.startAt).getTime()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endAt"],
        message: "结束时间不能早于开始时间",
      });
    }
  });

const timeWindowMorphologyItemSchema = withTimeRangeValidation(
  z
    .object({
      kind: z.literal("timeWindow"),
      label: morphologyLabelSchema,
      timeframe: morphologyTimeframeSchema.optional(),
      startAt: morphologyDateTimeSchema,
      endAt: morphologyDateTimeSchema,
      tone: morphologyToneSchema.optional(),
      notes: morphologyNotesSchema.optional(),
    })
    .strict(),
);

export const recordMorphologyItemSchema = z.discriminatedUnion("kind", [
  trendMorphologyItemSchema,
  biMorphologyItemSchema,
  segmentMorphologyItemSchema,
  pivotZoneMorphologyItemSchema,
  keyLevelMorphologyItemSchema,
  targetZoneMorphologyItemSchema,
  timeWindowMorphologyItemSchema,
]);

export const recordMorphologySchema = z
  .object({
    version: z.literal("v1"),
    items: z.array(recordMorphologyItemSchema).max(24),
  })
  .strict();

export type RecordMorphology = z.infer<typeof recordMorphologySchema>;
export type RecordMorphologyItem = z.infer<typeof recordMorphologyItemSchema>;

export function parseRecordMorphology(input: unknown) {
  return recordMorphologySchema.parse(input);
}

export function serializeRecordMorphology(morphology?: RecordMorphology) {
  return morphology ? JSON.stringify(morphology) : null;
}

export function parseStoredRecordMorphology(input: string | null | undefined) {
  if (!input) {
    return null;
  }

  try {
    return recordMorphologySchema.parse(JSON.parse(input));
  } catch {
    return null;
  }
}
