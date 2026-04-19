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

  it("reuses one record outcome row per subject scope and replaces prior review tags", async () => {
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

    const firstOutcome = await outcomeRepository.upsertRecordOutcome({
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

    await outcomeRepository.replaceReviewTags(firstOutcome.id, ["趋势跟随", "自定义: 新闻催化"]);

    const updatedOutcome = await outcomeRepository.upsertRecordOutcome({
      subjectType: "record",
      subjectId: record.id,
      symbol: "BTC",
      timeframe: "1h",
      windowType: "trade-follow-through",
      windowStartAt: new Date("2026-04-19T09:00:00.000Z"),
      windowEndAt: new Date("2026-04-20T09:00:00.000Z"),
      resultLabel: "neutral",
      resultReason: "二次回踩后回到区间中部",
      forwardReturnPercent: 1.4,
      maxFavorableExcursionPercent: 2.2,
      maxAdverseExcursionPercent: -1.1,
      ruleVersion: "v2",
    });

    await outcomeRepository.replaceReviewTags(updatedOutcome.id, ["突破追随"]);

    const saved = await outcomeRepository.listSliceOutcomes({
      symbol: "BTC",
      timeframe: "1h",
    });
    const recordOutcome = saved.find((item) => item.subjectType === "record");

    expect(updatedOutcome.id).toBe(firstOutcome.id);
    expect(await db.recordOutcome.count()).toBe(1);
    expect(recordOutcome).toMatchObject({
      id: firstOutcome.id,
      subjectType: "record",
      subjectId: record.id,
      recordId: record.id,
      planId: null,
      resultLabel: "neutral",
      ruleVersion: "v2",
      reviewTags: ["突破追随"],
    });
  });

  it("keeps separate plan outcome rows for different timeframe and window slices", async () => {
    const trader = await db.traderProfile.create({ data: { name: "Trader A" } });
    const record = await db.traderRecord.create({
      data: {
        traderId: trader.id,
        symbol: "BTC",
        recordType: "view",
        sourceType: "manual",
        occurredAt: new Date("2026-04-19T09:00:00.000Z"),
        rawContent: "BTC 突破后有望继续扩张",
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

    const firstPlanOutcome = await outcomeRepository.upsertRecordOutcome({
      subjectType: "plan",
      subjectId: plan.id,
      symbol: "BTC",
      timeframe: "1h",
      windowType: "plan-follow-through",
      windowStartAt: new Date("2026-04-19T09:00:00.000Z"),
      windowEndAt: new Date("2026-04-20T09:00:00.000Z"),
      resultLabel: "good",
      resultReason: "先命中顺向阈值",
      forwardReturnPercent: 3.2,
      maxFavorableExcursionPercent: 5.4,
      maxAdverseExcursionPercent: -1.1,
      ruleVersion: "v1",
    });

    const secondPlanOutcome = await outcomeRepository.upsertRecordOutcome({
      subjectType: "plan",
      subjectId: plan.id,
      symbol: "BTC",
      timeframe: "4h",
      windowType: "plan-follow-through",
      windowStartAt: new Date("2026-04-19T10:00:00.000Z"),
      windowEndAt: new Date("2026-04-21T10:00:00.000Z"),
      resultLabel: "neutral",
      resultReason: "先走弱后收回区间",
      forwardReturnPercent: 0.8,
      maxFavorableExcursionPercent: 2.1,
      maxAdverseExcursionPercent: -1.8,
      ruleVersion: "v1",
    });
    const updatedFirstPlanOutcome = await outcomeRepository.upsertRecordOutcome({
      subjectType: "plan",
      subjectId: plan.id,
      symbol: "BTC",
      timeframe: "1h",
      windowType: "plan-follow-through",
      windowStartAt: new Date("2026-04-19T09:30:00.000Z"),
      windowEndAt: new Date("2026-04-20T09:30:00.000Z"),
      resultLabel: "bad",
      resultReason: "回踩失守",
      forwardReturnPercent: -2.3,
      maxFavorableExcursionPercent: 0.6,
      maxAdverseExcursionPercent: -3.1,
      ruleVersion: "v2",
    });

    const oneHourOutcomes = await outcomeRepository.listSliceOutcomes({
      symbol: "BTC",
      timeframe: "1h",
    });
    const fourHourOutcomes = await outcomeRepository.listSliceOutcomes({
      symbol: "BTC",
      timeframe: "4h",
    });

    expect(updatedFirstPlanOutcome.id).toBe(firstPlanOutcome.id);
    expect(secondPlanOutcome.id).not.toBe(firstPlanOutcome.id);
    expect(await db.recordOutcome.count()).toBe(2);
    expect(oneHourOutcomes[0]).toMatchObject({
      id: firstPlanOutcome.id,
      subjectType: "plan",
      subjectId: plan.id,
      planId: plan.id,
      timeframe: "1h",
      resultLabel: "bad",
      ruleVersion: "v2",
    });
    expect(fourHourOutcomes[0]).toMatchObject({
      id: secondPlanOutcome.id,
      subjectType: "plan",
      subjectId: plan.id,
      planId: plan.id,
      timeframe: "4h",
      resultLabel: "neutral",
      ruleVersion: "v1",
    });
  });
});
