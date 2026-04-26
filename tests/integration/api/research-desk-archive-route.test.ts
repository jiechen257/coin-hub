// @vitest-environment node

process.env.DATABASE_URL = "file:./prisma/test.db";
process.env.LOCAL_DATABASE_URL = "file:./prisma/test.db";
process.env.TURSO_DATABASE_URL = "";
process.env.TURSO_AUTH_TOKEN = "";

const { GET: getArchiveRoute } = await import("@/app/api/research-desk/archive/route");
const { db } = await import("@/lib/db");
const { candleRepository } = await import("@/modules/market-data/candle-repository");
const { outcomeRepository } = await import("@/modules/outcomes/outcome-repository");

async function cleanDatabase() {
  await db.recordOutcomeReviewTag.deleteMany();
  await db.reviewTag.deleteMany();
  await db.recordOutcome.deleteMany();
  await db.candle.deleteMany();
  await db.executionPlan.deleteMany();
  await db.traderRecord.deleteMany();
  await db.traderProfile.deleteMany();
}

async function createArchivedRecord(input: {
  traderId: string;
  rawContent: string;
  symbol?: "BTC" | "ETH";
  timeframe?: string;
  archivedAt: Date;
  archiveSummary?: string | null;
}) {
  return db.traderRecord.create({
    data: {
      traderId: input.traderId,
      symbol: input.symbol ?? "BTC",
      timeframe: input.timeframe ?? "1h",
      recordType: "view",
      sourceType: "manual",
      occurredAt: input.archivedAt,
      startedAt: input.archivedAt,
      endedAt: input.archivedAt,
      rawContent: input.rawContent,
      status: "archived",
      archivedAt: input.archivedAt,
      archiveSummary: input.archiveSummary,
      executionPlans: {
        create: {
          label: "plan-a",
          status: "draft",
          side: "long",
          triggerText: "突破触发",
          entryText: "回踩入场",
        },
      },
    },
    include: {
      executionPlans: true,
    },
  });
}

async function createOutcomeForRecord(input: {
  recordId: string;
  symbol?: "BTC" | "ETH";
  timeframe?: string;
  resultLabel?: "good" | "neutral" | "bad" | "pending";
  reviewTags?: string[];
}) {
  const outcome = await outcomeRepository.upsertRecordOutcome({
    subjectType: "record",
    subjectId: input.recordId,
    symbol: input.symbol ?? "BTC",
    timeframe: input.timeframe ?? "1h",
    windowType: "trade-follow-through",
    windowStartAt: new Date("2026-04-20T00:00:00.000Z"),
    windowEndAt: new Date("2026-04-20T04:00:00.000Z"),
    resultLabel: input.resultLabel ?? "good",
    resultReason: "归档分析测试结果",
    forwardReturnPercent: 4,
    maxFavorableExcursionPercent: 6,
    maxAdverseExcursionPercent: -1,
    ruleVersion: "test",
  });

  if (input.reviewTags) {
    return outcomeRepository.replaceReviewTags(outcome.id, input.reviewTags);
  }

  return outcome;
}

describe("research desk archive route", () => {
  beforeEach(cleanDatabase);
  afterEach(cleanDatabase);

  it("returns archived records, stats, candles, outcomes, and review tag options", async () => {
    const trader = await db.traderProfile.create({
      data: { name: "Trader Archive Route" },
    });
    const record = await createArchivedRecord({
      traderId: trader.id,
      rawContent: "BTC 归档复盘",
      archivedAt: new Date("2026-04-22T00:00:00.000Z"),
      archiveSummary: "完整复盘",
    });

    await candleRepository.storeCandles({
      symbol: "BTC",
      timeframe: "1h",
      candles: [
        {
          openTime: new Date("2026-04-22T00:00:00.000Z"),
          open: 100,
          high: 105,
          low: 98,
          close: 103,
          volume: 10,
        },
      ],
    });
    await createOutcomeForRecord({
      recordId: record.id,
      reviewTags: ["趋势跟随"],
    });

    const response = await getArchiveRoute(
      new Request("http://localhost/api/research-desk/archive?symbol=BTC&timeframe=1h"),
    );

    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      records: Array<{ id: string }>;
      selectedRecordId: string | null;
      archiveStats: { recordCount: number; summarizedCount: number; goodRate: number };
      chart: { candles: unknown[]; outcomes: Array<{ recordId: string | null }> };
      reviewTagOptions: Array<{ label: string }>;
    };

    expect(payload.records.map((item) => item.id)).toEqual([record.id]);
    expect(payload.selectedRecordId).toBe(record.id);
    expect(payload.archiveStats).toMatchObject({
      recordCount: 1,
      summarizedCount: 1,
      goodRate: 1,
    });
    expect(payload.chart.candles).toHaveLength(1);
    expect(payload.chart.outcomes[0]?.recordId).toBe(record.id);
    expect(payload.reviewTagOptions.map((option) => option.label)).toContain(
      "趋势跟随",
    );
  });

  it("lets recordId override selection and falls back to the latest archived record", async () => {
    const trader = await db.traderProfile.create({
      data: { name: "Trader Archive Select" },
    });
    const olderBtc = await createArchivedRecord({
      traderId: trader.id,
      rawContent: "BTC 较早归档",
      symbol: "BTC",
      timeframe: "1h",
      archivedAt: new Date("2026-04-20T00:00:00.000Z"),
    });
    const newerEth = await createArchivedRecord({
      traderId: trader.id,
      rawContent: "ETH 最新归档",
      symbol: "ETH",
      timeframe: "4h",
      archivedAt: new Date("2026-04-22T00:00:00.000Z"),
    });

    const selectedResponse = await getArchiveRoute(
      new Request(
        `http://localhost/api/research-desk/archive?recordId=${olderBtc.id}`,
      ),
    );
    const fallbackResponse = await getArchiveRoute(
      new Request(
        "http://localhost/api/research-desk/archive?symbol=ETH&timeframe=4h&recordId=missing",
      ),
    );

    const selectedPayload = (await selectedResponse.json()) as {
      selectedRecordId: string | null;
      selection: { symbol: string; timeframe: string };
    };
    const fallbackPayload = (await fallbackResponse.json()) as {
      selectedRecordId: string | null;
      selection: { symbol: string; timeframe: string };
    };

    expect(selectedPayload.selectedRecordId).toBe(olderBtc.id);
    expect(selectedPayload.selection).toEqual({ symbol: "BTC", timeframe: "1h" });
    expect(fallbackPayload.selectedRecordId).toBe(newerEth.id);
    expect(fallbackPayload.selection).toEqual({ symbol: "ETH", timeframe: "4h" });
  });

  it("applies q search to records, selection fallback, stats, and chart outcomes", async () => {
    const trader = await db.traderProfile.create({
      data: { name: "Trader Archive Search" },
    });
    const matched = await createArchivedRecord({
      traderId: trader.id,
      rawContent: "突破后的归档记录",
      archivedAt: new Date("2026-04-22T00:00:00.000Z"),
    });
    const skipped = await createArchivedRecord({
      traderId: trader.id,
      rawContent: "震荡记录",
      archivedAt: new Date("2026-04-21T00:00:00.000Z"),
    });

    await createOutcomeForRecord({ recordId: matched.id, resultLabel: "good" });
    await createOutcomeForRecord({ recordId: skipped.id, resultLabel: "bad" });

    const response = await getArchiveRoute(
      new Request(
        "http://localhost/api/research-desk/archive?symbol=BTC&timeframe=1h&q=%E7%AA%81%E7%A0%B4",
      ),
    );

    const payload = (await response.json()) as {
      records: Array<{ id: string }>;
      selectedRecordId: string | null;
      archiveStats: { recordCount: number };
      chart: { outcomes: Array<{ recordId: string | null }> };
    };

    expect(payload.records.map((record) => record.id)).toEqual([matched.id]);
    expect(payload.selectedRecordId).toBe(matched.id);
    expect(payload.archiveStats.recordCount).toBe(1);
    expect(payload.chart.outcomes.map((outcome) => outcome.recordId)).toEqual([
      matched.id,
    ]);
  });

  it("returns an empty archive payload when no archived records exist", async () => {
    const response = await getArchiveRoute(
      new Request("http://localhost/api/research-desk/archive?symbol=BTC&timeframe=1h"),
    );
    const payload = (await response.json()) as {
      records: unknown[];
      selectedRecordId: string | null;
      archiveStats: { recordCount: number; goodRate: number | null };
      chart: { outcomes: unknown[] };
    };

    expect(response.status).toBe(200);
    expect(payload.records).toEqual([]);
    expect(payload.selectedRecordId).toBeNull();
    expect(payload.archiveStats).toMatchObject({
      recordCount: 0,
      goodRate: null,
    });
    expect(payload.chart.outcomes).toEqual([]);
  });
});
