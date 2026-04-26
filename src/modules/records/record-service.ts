import {
  archiveTraderRecord,
  createTraderRecord,
  listTraderRecords,
  setTraderRecordStatus,
  updateTraderRecordArchiveSummary,
  updateTraderRecord,
  type ListTraderRecordsInput,
} from "@/modules/records/record-repository";
import {
  createRecordSchema,
  updateRecordSchema,
} from "@/modules/records/record-schema";
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
    startedAt: new Date(parsed.startedAt),
    endedAt: new Date(parsed.endedAt),
    morphology: parsed.morphology,
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

export async function updateRecordFromInput(recordId: string, input: unknown) {
  const parsed = updateRecordSchema.parse(input);
  const plans =
    parsed.recordType === "trade"
      ? [
          {
            ...parsed.trade,
            label: "real-trade",
          },
        ]
      : parsed.plans;

  const record = await updateTraderRecord(recordId, {
    traderId: parsed.traderId,
    symbol: parsed.symbol,
    recordType: parsed.recordType,
    sourceType: parsed.sourceType,
    startedAt: new Date(parsed.startedAt),
    endedAt: new Date(parsed.endedAt),
    morphology: parsed.morphology,
    rawContent: parsed.rawContent,
    notes: parsed.notes,
    plans,
  });

  return record;
}

export async function archiveRecordById(recordId: string) {
  return archiveTraderRecord(recordId);
}

export async function listRecordsFromInput(input: ListTraderRecordsInput = {}) {
  return listTraderRecords(input);
}

export async function setRecordStatusById(
  recordId: string,
  status: "not_started" | "in_progress" | "ended",
) {
  return setTraderRecordStatus(recordId, status);
}

export async function updateRecordArchiveSummaryById(
  recordId: string,
  archiveSummary: string | null,
) {
  return updateTraderRecordArchiveSummary(recordId, archiveSummary);
}
