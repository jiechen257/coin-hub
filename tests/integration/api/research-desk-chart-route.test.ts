// @vitest-environment node

process.env.TURSO_DATABASE_URL = "";
process.env.TURSO_AUTH_TOKEN = "";

const { GET: getChart } = await import("@/app/api/research-desk/chart/route");
const { db } = await import("@/lib/db");
const { outcomeRepository } = await import("@/modules/outcomes/outcome-repository");

async function resetFixtures() {
  await db.recordOutcomeReviewTag.deleteMany();
  await db.reviewTag.deleteMany();
  await db.recordOutcome.deleteMany();
  await db.executionPlan.deleteMany();
  await db.traderRecord.deleteMany();
  await db.traderProfile.deleteMany();
  await db.candle.deleteMany();
}

async function seedChartSlice() {
  const trader = await db.traderProfile.create({
    data: { name: "Slice Trader" },
  });

  const record = await db.traderRecord.create({
    data: {
      traderId: trader.id,
      symbol: "BTC",
      timeframe: "1h",
      recordType: "trade",
      sourceType: "manual",
      occurredAt: new Date("2026-04-19T09:00:00.000Z"),
      rawContent: "BTC 放量突破后回踩确认",
    },
  });

  await db.candle.createMany({
    data: [
      {
        symbol: "BTC",
        timeframe: "1h",
        openTime: new Date("2026-04-19T09:00:00.000Z"),
        open: 85000,
        high: 85200,
        low: 84850,
        close: 85120,
        volume: 10,
        source: "binance",
      },
      {
        symbol: "BTC",
        timeframe: "1h",
        openTime: new Date("2026-04-19T10:00:00.000Z"),
        open: 85120,
        high: 85600,
        low: 85020,
        close: 85550,
        volume: 12,
        source: "binance",
      },
    ],
  });

  const outcome = await outcomeRepository.upsertRecordOutcome({
    subjectType: "record",
    subjectId: record.id,
    symbol: "BTC",
    timeframe: "1h",
    windowType: "trade-follow-through",
    windowStartAt: new Date("2026-04-19T09:00:00.000Z"),
    windowEndAt: new Date("2026-04-20T09:00:00.000Z"),
    resultLabel: "good",
    resultReason: "顺向延续占优",
    forwardReturnPercent: 2.8,
    maxFavorableExcursionPercent: 4.1,
    maxAdverseExcursionPercent: -0.9,
    ruleVersion: "v1",
  });

  await outcomeRepository.replaceReviewTags(outcome.id, ["趋势跟随", "自定义: 新闻催化"]);
}

describe("research-desk chart route", () => {
  beforeEach(async () => {
    await resetFixtures();
  });

  afterEach(async () => {
    await resetFixtures();
  });

  it("returns one chart slice with candles, outcomes, and aggregates", async () => {
    await seedChartSlice();

    const response = await getChart(
      new Request(
        "http://localhost:3000/api/research-desk/chart?symbol=BTC&timeframe=1h",
      ),
    );
    const payload = (await response.json()) as {
      selection: { symbol: string; timeframe: string };
      selectedOutcomeId: string | null;
      reviewTagOptions: Array<{ label: string; kind: string }>;
      chart: {
        candles: unknown[];
        outcomes: Array<{ reviewTags: string[] }>;
      };
      summary: {
        counts: {
          good: number;
          neutral: number;
          bad: number;
          pending: number;
          total: number;
        };
      };
    };

    expect(response.status).toBe(200);
    expect(Object.keys(payload).sort()).toEqual([
      "chart",
      "reviewTagOptions",
      "selectedOutcomeId",
      "selection",
      "summary",
    ]);
    expect(payload.selection).toEqual({ symbol: "BTC", timeframe: "1h" });
    expect(payload.selectedOutcomeId).toEqual(expect.any(String));
    expect(payload.reviewTagOptions).toEqual(
      expect.arrayContaining([
        { label: "趋势跟随", kind: "preset" },
        { label: "自定义: 新闻催化", kind: "custom" },
      ]),
    );
    expect(Array.isArray(payload.chart.candles)).toBe(true);
    expect(Array.isArray(payload.chart.outcomes)).toBe(true);
    expect(payload.chart.outcomes[0]?.reviewTags).toEqual([
      "趋势跟随",
      "自定义: 新闻催化",
    ]);
    expect(payload.summary.counts).toEqual(
      expect.objectContaining({
        good: expect.any(Number),
        neutral: expect.any(Number),
        bad: expect.any(Number),
        pending: expect.any(Number),
        total: expect.any(Number),
      }),
    );
  });
});
