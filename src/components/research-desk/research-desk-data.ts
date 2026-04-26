import type {
  ResearchDeskPayload,
  ResearchDeskRecord,
} from "@/components/research-desk/research-desk-types";
import {
  loadResearchDeskChartSlice,
} from "@/components/research-desk/research-desk-chart-slice";
import type {
  ResearchDeskSymbol,
  ResearchDeskTimeframe,
} from "@/components/research-desk/research-desk-types";
import {
  serializeRecord,
  serializeTrader,
} from "@/modules/records/record-serializer";
import { selectPreferredRecordId } from "@/modules/records/record-status";
import { ensureResearchDeskSchema } from "@/lib/research-desk-schema-bootstrap";

function prepareResearchDeskLoaderEnv() {
  if (process.env.VITEST) {
    process.env.TURSO_DATABASE_URL = "";
    process.env.TURSO_AUTH_TOKEN = "";
  }
}

async function getResearchDeskDb() {
  prepareResearchDeskLoaderEnv();
  const { db } = await import("@/lib/db");
  return db;
}

function formatResearchDeskLoadError(error: unknown) {
  return error instanceof Error ? error.message : "unknown load error";
}

function buildEmptyResearchDeskPayload(
  chartSlice: Awaited<ReturnType<typeof loadResearchDeskChartSlice>>,
): ResearchDeskPayload {
  return {
    ...chartSlice,
    traders: [],
    records: [],
    selectedRecordId: null,
    candidates: [],
  };
}

export async function listSerializedStrategyCandidates() {
  await ensureResearchDeskSchema();
  const db = await getResearchDeskDb();
  const candidates = await db.strategyCandidate.findMany({
    include: {
      samples: {
        include: {
          sample: {
            include: {
              plan: {
                include: {
                  record: {
                    include: {
                      trader: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ sampleCount: "desc" }, { updatedAt: "desc" }],
    take: 20,
  });

  return candidates
    .map((candidate) => {
      const activeSamples = candidate.samples.filter(
        (link) => link.sample.plan.record.archivedAt === null,
      );

      if (activeSamples.length === 0) {
        return null;
      }

      return {
        id: candidate.id,
        marketContext: candidate.marketContext,
        triggerText: candidate.triggerText,
        entryText: candidate.entryText,
        riskText: candidate.riskText,
        exitText: candidate.exitText,
        sampleCount: activeSamples.length,
        winRate:
          activeSamples.filter((link) => link.sample.resultTag === "win").length /
          activeSamples.length,
        sampleRefs: activeSamples.map((link) => ({
          sampleId: link.sample.id,
          recordId: link.sample.plan.record.id,
          traderName: link.sample.plan.record.trader.name,
          rawContent: link.sample.plan.record.rawContent,
        })),
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null);
}

export async function loadResearchDeskPayload(input: {
  symbol: ResearchDeskSymbol;
  timeframe: ResearchDeskTimeframe;
}): Promise<ResearchDeskPayload> {
  await ensureResearchDeskSchema();
  const chartSlice = await loadResearchDeskChartSlice(input);

  try {
    const db = await getResearchDeskDb();
    const [traders, records, candidates] = await Promise.all([
      db.traderProfile.findMany({
        orderBy: { name: "asc" },
      }),
      db.traderRecord.findMany({
        where: {
          archivedAt: null,
          NOT: {
            status: "archived",
          },
        },
        include: {
          trader: true,
          executionPlans: {
            include: {
              sample: true,
            },
          },
        },
        orderBy: { startedAt: "desc" },
        take: 20,
      }),
      listSerializedStrategyCandidates(),
    ]);

    const serializedRecords = records.map(serializeRecord);

    return {
      ...chartSlice,
      traders: traders.map(serializeTrader),
      records: serializedRecords,
      selectedRecordId: selectPreferredRecordId(serializedRecords),
      candidates,
    };
  } catch (error) {
    console.warn(
      `[research-desk] falling back to empty db-backed payload: ${formatResearchDeskLoadError(error)}`,
    );

    return buildEmptyResearchDeskPayload(chartSlice);
  }
}
