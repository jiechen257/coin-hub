// @vitest-environment node

process.env.TURSO_DATABASE_URL = "";
process.env.TURSO_AUTH_TOKEN = "";

const { db } = await import("@/lib/db");
const { outcomeRepository } = await import("@/modules/outcomes/outcome-repository");

async function resetOutcomeFixtures() {
  await db.recordOutcomeReviewTag.deleteMany();
  await db.reviewTag.deleteMany();
  await db.recordOutcome.deleteMany();
  await db.executionPlan.deleteMany();
  await db.traderRecord.deleteMany();
  await db.traderProfile.deleteMany();
}

describe("outcome-repository", () => {
  beforeEach(async () => {
    await resetOutcomeFixtures();
  });

  afterEach(async () => {
    await resetOutcomeFixtures();
  });

  it("stores one outcome with preset and custom review tags", async () => {
    const trader = await db.traderProfile.create({ data: { name: "Trader A" } });
    const record = await db.traderRecord.create({
      data: {
        traderId: trader.id,
        symbol: "BTC",
        recordType: "trade",
        sourceType: "manual",
        occurredAt: new Date("2026-04-19T09:00:00.000Z"),
        rawContent: "BTC 回踩支撑后二次突破",
      },
    });

    const outcome = await outcomeRepository.upsertRecordOutcome({
      recordId: record.id,
      symbol: "BTC",
      timeframe: "1h",
      windowType: "trade-follow-through",
      windowStartAt: new Date("2026-04-19T09:00:00.000Z"),
      windowEndAt: new Date("2026-04-20T09:00:00.000Z"),
      resultLabel: "good",
      resultReason: "先命中顺向阈值",
      forwardReturnPercent: 3.2,
      maxFavorableExcursionPercent: 5.4,
      maxAdverseExcursionPercent: -1.1,
      ruleVersion: "v1",
    });

    await outcomeRepository.replaceReviewTags(outcome.id, ["趋势跟随", "自定义: 新闻催化"]);

    const saved = await outcomeRepository.listSliceOutcomes({
      symbol: "BTC",
      timeframe: "1h",
    });

    expect(saved[0]?.reviewTags).toEqual(["趋势跟随", "自定义: 新闻催化"]);
  });
});
