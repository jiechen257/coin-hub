import { createTraderRecord } from "@/modules/records/record-repository";
import { createRecordSchema } from "@/modules/records/record-schema";

export async function createRecordFromInput(input: unknown) {
  const parsed = createRecordSchema.parse(input);

  const plans =
    parsed.recordType === "trade"
      ? [
          {
            ...parsed.trade,
            label: "real-trade",
          },
        ]
      : parsed.plans;

  return createTraderRecord({
    traderId: parsed.traderId,
    symbol: parsed.symbol,
    recordType: parsed.recordType,
    sourceType: parsed.sourceType,
    occurredAt: new Date(parsed.occurredAt),
    rawContent: parsed.rawContent,
    notes: parsed.notes,
    plans,
  });
}
