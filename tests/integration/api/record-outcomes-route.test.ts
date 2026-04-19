// @vitest-environment node

process.env.TURSO_DATABASE_URL = "";
process.env.TURSO_AUTH_TOKEN = "";

const { PATCH: patchOutcome } = await import(
  "@/app/api/record-outcomes/[outcomeId]/route"
);
const { db } = await import("@/lib/db");
const { outcomeRepository } = await import("@/modules/outcomes/outcome-repository");

async function resetFixtures() {
  await db.recordOutcomeReviewTag.deleteMany();
  await db.reviewTag.deleteMany();
  await db.recordOutcome.deleteMany();
  await db.executionPlan.deleteMany();
  await db.traderRecord.deleteMany();
  await db.traderProfile.deleteMany();
}

async function seedOutcome() {
  const trader = await db.traderProfile.create({
    data: { name: "Outcome Trader" },
  });

  const record = await db.traderRecord.create({
    data: {
      id: "outcome-1",
      traderId: trader.id,
      symbol: "BTC",
      timeframe: "1h",
      recordType: "trade",
      sourceType: "manual",
      occurredAt: new Date("2026-04-19T08:00:00.000Z"),
      rawContent: "BTC 延续多单",
    },
  });

  return outcomeRepository.upsertRecordOutcome({
    subjectType: "record",
    subjectId: record.id,
    symbol: "BTC",
    timeframe: "1h",
    windowType: "trade-follow-through",
    windowStartAt: new Date("2026-04-19T08:00:00.000Z"),
    windowEndAt: new Date("2026-04-20T08:00:00.000Z"),
    resultLabel: "neutral",
    resultReason: "先突破后回落",
    forwardReturnPercent: 0.9,
    maxFavorableExcursionPercent: 2.4,
    maxAdverseExcursionPercent: -1.7,
    ruleVersion: "v1",
  });
}

describe("record outcomes route", () => {
  beforeEach(async () => {
    await resetFixtures();
  });

  afterEach(async () => {
    await resetFixtures();
  });

  it("replaces review tags on one outcome", async () => {
    const outcome = await seedOutcome();

    const response = await patchOutcome(
      new Request(`http://localhost:3000/api/record-outcomes/${outcome.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reviewTags: ["趋势跟随", "自定义: 新闻催化"],
        }),
      }),
      { params: Promise.resolve({ outcomeId: outcome.id }) },
    );

    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      outcome: { id: string; reviewTags: string[] };
    };

    expect(payload.outcome.id).toBe(outcome.id);
    expect(payload.outcome.reviewTags).toEqual([
      "趋势跟随",
      "自定义: 新闻催化",
    ]);

    const saved = await outcomeRepository.listSliceOutcomes({
      symbol: "BTC",
      timeframe: "1h",
    });

    expect(saved[0]?.reviewTags).toEqual(["趋势跟随", "自定义: 新闻催化"]);
  });
});
