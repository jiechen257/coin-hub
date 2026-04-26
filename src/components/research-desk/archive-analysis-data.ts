import { ensureResearchDeskSchema } from "@/lib/research-desk-schema-bootstrap";
import {
  buildOutcomeSummary,
  buildReviewTagOptions,
  parseTimeframe,
  serializeOutcome,
} from "@/components/research-desk/research-desk-chart-slice";
import type {
  ResearchDeskArchivePayload,
  ResearchDeskRecord,
  ResearchDeskSelection,
  ResearchDeskSymbol,
  ResearchDeskTimeframe,
} from "@/components/research-desk/research-desk-types";
import { serializeRecord } from "@/modules/records/record-serializer";

type ArchiveQuery = {
  symbol?: ResearchDeskSymbol;
  timeframe?: ResearchDeskTimeframe;
  recordId?: string;
  traderId?: string;
  reviewTag?: string;
  q?: string;
};

function prepareResearchDeskLoaderEnv() {
  if (process.env.VITEST) {
    process.env.TURSO_DATABASE_URL = "";
    process.env.TURSO_AUTH_TOKEN = "";
  }
}

async function getArchiveDependencies() {
  prepareResearchDeskLoaderEnv();
  const [{ db }, { candleRepository }, { outcomeRepository }] = await Promise.all([
    import("@/lib/db"),
    import("@/modules/market-data/candle-repository"),
    import("@/modules/outcomes/outcome-repository"),
  ]);

  return {
    db,
    candleRepository,
    outcomeRepository,
  };
}

function buildArchiveSearchWhere(q?: string) {
  const normalized = q?.trim();

  if (!normalized) {
    return {};
  }

  return {
    OR: [
      {
        rawContent: {
          contains: normalized,
        },
      },
      {
        notes: {
          contains: normalized,
        },
      },
      {
        archiveSummary: {
          contains: normalized,
        },
      },
      {
        trader: {
          name: {
            contains: normalized,
          },
        },
      },
    ],
  };
}

function resolveSelectedArchiveRecord(
  records: ResearchDeskRecord[],
  preferredRecordId?: string,
) {
  return (
    records.find((record) => record.id === preferredRecordId) ??
    records[0] ??
    null
  );
}

function resolveArchiveSelection(
  input: ArchiveQuery,
  selectedRecord: ResearchDeskRecord | null,
): ResearchDeskSelection {
  if (selectedRecord) {
    return {
      symbol: selectedRecord.symbol,
      timeframe: parseTimeframe(selectedRecord.timeframe),
    };
  }

  return {
    symbol: input.symbol ?? "BTC",
    timeframe: input.timeframe ?? "1h",
  };
}

function buildArchiveStats(args: {
  records: ResearchDeskRecord[];
  summary: ResearchDeskArchivePayload["summary"];
}): ResearchDeskArchivePayload["archiveStats"] {
  const summarizedCount = args.records.filter((record) =>
    Boolean(record.archiveSummary?.trim()),
  ).length;
  const completedTotal =
    args.summary.counts.good + args.summary.counts.neutral + args.summary.counts.bad;

  return {
    recordCount: args.records.length,
    summarizedCount,
    unsummarizedCount: args.records.length - summarizedCount,
    goodRate:
      completedTotal > 0 ? args.summary.counts.good / completedTotal : null,
    topReviewTags: args.summary.reviewTags.slice(0, 5).map((tag) => ({
      label: tag.label,
      count: tag.count,
    })),
  };
}

function filterRecordsByReviewTag(
  records: ResearchDeskRecord[],
  outcomes: Array<{ recordId: string | null; planId: string | null; reviewTags: string[] }>,
  reviewTag?: string,
) {
  if (!reviewTag) {
    return records;
  }

  const recordIds = new Set(
    outcomes
      .filter((outcome) => outcome.reviewTags.includes(reviewTag))
      .flatMap((outcome) => (outcome.recordId ? [outcome.recordId] : [])),
  );
  const planIds = new Set(
    outcomes
      .filter((outcome) => outcome.reviewTags.includes(reviewTag))
      .flatMap((outcome) => (outcome.planId ? [outcome.planId] : [])),
  );

  return records.filter(
    (record) =>
      recordIds.has(record.id) ||
      record.executionPlans.some((plan) => planIds.has(plan.id)),
  );
}

export async function loadResearchDeskArchivePayload(
  input: ArchiveQuery = {},
): Promise<ResearchDeskArchivePayload> {
  await ensureResearchDeskSchema();
  const { db, candleRepository, outcomeRepository } = await getArchiveDependencies();
  const requestedSelection = {
    symbol: input.symbol ?? "BTC",
    timeframe: input.timeframe ?? "1h",
  };
  const dbRecords = await db.traderRecord.findMany({
    where: {
      OR: [{ status: "archived" }, { archivedAt: { not: null } }],
      ...(input.traderId ? { traderId: input.traderId } : {}),
      ...(input.symbol ? { symbol: input.symbol } : {}),
      ...buildArchiveSearchWhere(input.q),
    },
    include: { trader: true, executionPlans: { include: { sample: true } } },
    orderBy: [{ archivedAt: "desc" }, { startedAt: "desc" }, { occurredAt: "desc" }],
  });
  let records = dbRecords.map(serializeRecord);
  let selectedRecord = resolveSelectedArchiveRecord(records, input.recordId);
  let selection = resolveArchiveSelection(input, selectedRecord);
  let outcomes = (
    await outcomeRepository.listArchiveOutcomes({
      recordIds: records.map((record) => record.id),
      symbol: selection.symbol,
      timeframe: selection.timeframe,
    })
  ).map(serializeOutcome);

  records = filterRecordsByReviewTag(records, outcomes, input.reviewTag);
  selectedRecord = resolveSelectedArchiveRecord(records, input.recordId);
  selection = resolveArchiveSelection(
    {
      ...input,
      ...requestedSelection,
    },
    selectedRecord,
  );
  outcomes = (
    await outcomeRepository.listArchiveOutcomes({
      recordIds: records.map((record) => record.id),
      symbol: selection.symbol,
      timeframe: selection.timeframe,
    })
  ).map(serializeOutcome);

  const summary = buildOutcomeSummary(outcomes);
  const candles = await candleRepository
    .listCandlesWithPreferredSource({
      symbol: selection.symbol,
      timeframe: selection.timeframe,
      preferredSource: "binance",
    })
    .catch(() => []);

  return {
    selection,
    records,
    selectedRecordId: selectedRecord?.id ?? null,
    reviewTagOptions: buildReviewTagOptions(outcomes),
    summary,
    archiveStats: buildArchiveStats({ records, summary }),
    chart: {
      candles: candles.map((candle) => ({
        openTime: candle.openTime.toISOString(),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      })),
      outcomes,
    },
  };
}
