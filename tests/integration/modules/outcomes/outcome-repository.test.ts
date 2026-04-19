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

  it("stores record and plan outcomes with subject semantics and review tags", async () => {
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
    const plan = await db.executionPlan.create({
      data: {
        recordId: record.id,
        label: "突破延续",
        side: "long",
        triggerText: "突破前高后回踩站稳",
        entryText: "确认放量后二次跟进",
      },
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
      resultReason: "先命中顺向阈值",
      forwardReturnPercent: 3.2,
      maxFavorableExcursionPercent: 5.4,
      maxAdverseExcursionPercent: -1.1,
      ruleVersion: "v1",
    });

    await outcomeRepository.replaceReviewTags(outcome.id, ["趋势跟随", "自定义: 新闻催化"]);
    await outcomeRepository.upsertRecordOutcome({
      subjectType: "plan",
      subjectId: plan.id,
      symbol: "BTC",
      timeframe: "1h",
      windowType: "plan-follow-through",
      windowStartAt: new Date("2026-04-19T10:00:00.000Z"),
      windowEndAt: new Date("2026-04-20T10:00:00.000Z"),
      resultLabel: "neutral",
      resultReason: "先走弱后收回区间",
      forwardReturnPercent: 0.8,
      maxFavorableExcursionPercent: 2.1,
      maxAdverseExcursionPercent: -1.8,
      ruleVersion: "v1",
    });

    const saved = await outcomeRepository.listSliceOutcomes({
      symbol: "BTC",
      timeframe: "1h",
    });

    const recordOutcome = saved.find((item) => item.subjectType === "record");
    const planOutcome = saved.find((item) => item.subjectType === "plan");

    expect(recordOutcome).toMatchObject({
      subjectType: "record",
      subjectId: record.id,
      recordId: record.id,
      planId: null,
      reviewTags: ["趋势跟随", "自定义: 新闻催化"],
    });
    expect(planOutcome).toMatchObject({
      subjectType: "plan",
      subjectId: plan.id,
      recordId: null,
      planId: plan.id,
      reviewTags: [],
    });
  });
});
