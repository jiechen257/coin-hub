import { createTraderRecord } from "@/modules/records/record-repository";
import { createRecordSchema } from "@/modules/records/record-schema";
import { syncOutcomesForRecordId } from "@/modules/outcomes/outcome-service";

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

  const record = await createTraderRecord({
    traderId: parsed.traderId,
    symbol: parsed.symbol,
    recordType: parsed.recordType,
    sourceType: parsed.sourceType,
    occurredAt: new Date(parsed.occurredAt),
    rawContent: parsed.rawContent,
    notes: parsed.notes,
    plans,
  });

  try {
    await syncOutcomesForRecordId(record.id);
  } catch (error) {
    console.warn(
      `[records] failed to sync outcomes for ${record.id}: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }

  return record;
}
