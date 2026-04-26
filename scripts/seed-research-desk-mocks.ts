import "dotenv/config";

import type { PrismaClient } from "@prisma/client";
import { parseDevCliArgs } from "@/lib/dev-command-args";
import { resolveMockSeedRuntime } from "@/lib/mock-seed-runtime";
import type { NormalizedCandle } from "@/modules/market-data/normalize-candles";

const MOCK_SEED_ID = "research-desk-mocks-v1";
const MOCK_CANDLE_SOURCE = `mock-seed:${MOCK_SEED_ID}`;

const BTC_1H_CLOSES = [
  74860, 74920, 74890, 75010, 75120, 75280, 75560, 75840, 76020, 76190, 76340,
  76280, 76420, 76580, 76720, 76810, 76940, 77010, 77160, 77280, 77340, 77290,
  77250, 77340, 77480, 77620, 77810, 77740, 78420, 78760, 78520, 79120, 78840,
  78580, 78340, 78080, 77860, 77640, 77480, 77320, 77160, 77020, 76880, 76740,
  76590, 76440, 76300, 76160,
] as const;

const MOCK_CASES = [
  {
    trader: {
      name: "[Mock] 顺势突破样本",
      platform: "Binance",
      notes: MOCK_SEED_ID,
    },
    recordType: "trade" as const,
    recordCandleIndex: 5,
    rawContent:
      "[mock-seed] BTC 1h 放量突破前高后回踩承接，执行一笔顺势做多。",
    notes: "Good case：研究图应出现绿色 outcome 条，详情区显示正收益样本。",
    plan: {
      label: "突破回踩做多",
      side: "long" as const,
      entryPrice: 75280,
      exitPrice: 76420,
      stopLoss: 74880,
      takeProfit: 77160,
      marketContext: "突破延续",
      triggerText: "1h 放量站上 7.53 万上沿，回踩量缩不破位",
      entryText: "7.53 万一带承接后分批做多",
      riskText: "跌回 7.49 万下方立即止损",
      exitText: "先看 7.64 万，尾仓跟踪到 7.72 万",
      notes: "Mock good plan",
    },
    reviewTags: ["趋势跟随", "执行到位"],
    settlement: {
      fromCandleIndex: 5,
      toCandleIndex: 12,
      settledAtCandleIndex: 12,
      entryPrice: 75280,
      exitPrice: 76420,
      notes: "Mock sample win",
    },
  },
  {
    trader: {
      name: "[Mock] 逆势抢跑样本",
      platform: "Bybit",
      notes: MOCK_SEED_ID,
    },
    recordType: "view" as const,
    recordCandleIndex: 27,
    rawContent:
      "[mock-seed] BTC 1h 高位横盘后预判回落，尝试提前做空，结果被上破带走。",
    notes: "Bad case：研究图应出现红色 outcome 条，详情区显示负收益样本。",
    plan: {
      label: "顶部抢跑做空",
      side: "short" as const,
      entryPrice: 77740,
      exitPrice: 78980,
      stopLoss: 78920,
      takeProfit: 76380,
      marketContext: "高位震荡",
      triggerText: "7.78 万高位震荡后尝试抢跑做空",
      entryText: "7.77 万一带轻仓试空",
      riskText: "放量上破 7.89 万就认错离场",
      exitText: "回落到 7.64 万再看是否续持",
      notes: "Mock bad plan",
    },
    reviewTags: ["止损纪律差", "逆势抢跑"],
    settlement: {
      fromCandleIndex: 27,
      toCandleIndex: 31,
      settledAtCandleIndex: 31,
      entryPrice: 77740,
      exitPrice: 78980,
      notes: "Mock sample loss",
    },
  },
] as const;

function addHours(base: Date, hours: number) {
  return new Date(base.getTime() + hours * 60 * 60 * 1_000);
}

function buildMockCandles(): NormalizedCandle[] {
  const startAt = new Date("2026-04-18T00:00:00.000Z");

  return BTC_1H_CLOSES.map((close, index) => {
    const open = index === 0 ? 74780 : BTC_1H_CLOSES[index - 1];
    const highPad = index === 28 ? 260 : index === 31 ? 320 : 180;
    const lowPad = index >= 5 && index <= 12 ? 110 : 150;

    return {
      openTime: addHours(startAt, index),
      open,
      high: Math.max(open, close) + highPad,
      low: Math.min(open, close) - lowPad,
      close,
      volume: 180 + index * 11,
    };
  });
}

async function rebuildStrategyCandidates(db: PrismaClient) {
  const { buildStrategyCandidates } = await import(
    "@/modules/strategies/candidate-service"
  );
  const samples = await db.tradeSample.findMany({
    include: { plan: true },
  });
  const candidates = buildStrategyCandidates(samples);

  await db.$transaction(async (tx) => {
    await tx.strategyCandidateSample.deleteMany();
    await tx.strategyCandidate.deleteMany();

    for (const candidate of candidates) {
      const created = await tx.strategyCandidate.create({
        data: {
          marketContext: candidate.marketContext,
          triggerText: candidate.triggerText,
          entryText: candidate.entryText,
          riskText: candidate.riskText,
          exitText: candidate.exitText,
          sampleCount: candidate.sampleCount,
          winRate: candidate.winRate,
        },
      });

      await tx.strategyCandidateSample.createMany({
        data: candidate.sampleIds.map((sampleId) => ({
          candidateId: created.id,
          sampleId,
        })),
      });
    }
  });

  return candidates.length;
}

async function main() {
  const { targetOverride } = parseDevCliArgs(process.argv.slice(2));
  const runtime = resolveMockSeedRuntime(process.env, targetOverride);
  Object.assign(process.env, runtime.env);

  const [{ db }, { candleRepository }, { createTraderRecord }, { syncOutcomesForRecordId }, { outcomeRepository }, { settleExecutionPlan }] =
    await Promise.all([
      import("@/lib/db"),
      import("@/modules/market-data/candle-repository"),
      import("@/modules/records/record-repository"),
      import("@/modules/outcomes/outcome-service"),
      import("@/modules/outcomes/outcome-repository"),
      import("@/modules/samples/sample-service"),
    ]);

  const candles = buildMockCandles();
  const traderNames = MOCK_CASES.map((item) => item.trader.name);
  const mockTraders = await db.traderProfile.findMany({
    where: {
      OR: [
        { name: { in: traderNames } },
        { notes: MOCK_SEED_ID },
      ],
    },
    select: { id: true },
  });

  if (mockTraders.length > 0) {
    await db.traderProfile.deleteMany({
      where: {
        id: {
          in: mockTraders.map((trader) => trader.id),
        },
      },
    });
  }

  await db.candle.deleteMany({
    where: { source: MOCK_CANDLE_SOURCE },
  });

  await candleRepository.storeCandles({
    symbol: "BTC",
    timeframe: "1h",
    candles,
    source: MOCK_CANDLE_SOURCE,
  });

  const seededRecords = [];

  for (const spec of MOCK_CASES) {
    const trader = await db.traderProfile.create({
      data: spec.trader,
    });
    const record = await createTraderRecord({
      traderId: trader.id,
      symbol: "BTC",
      timeframe: "1h",
      recordType: spec.recordType,
      sourceType: "custom-import",
      startedAt: candles[spec.recordCandleIndex].openTime,
      endedAt: candles[spec.recordCandleIndex].openTime,
      rawContent: spec.rawContent,
      notes: spec.notes,
      plans: [spec.plan],
    });
    const plan = record.executionPlans[0];

    if (!plan) {
      throw new Error(`mock record ${record.id} is missing its execution plan`);
    }

    const syncedOutcomes = await syncOutcomesForRecordId(record.id, "1h");

    for (const outcome of syncedOutcomes) {
      await outcomeRepository.replaceReviewTags(outcome.id, spec.reviewTags);
    }

    await settleExecutionPlan({
      planId: plan.id,
      entryPrice: spec.settlement.entryPrice,
      exitPrice: spec.settlement.exitPrice,
      settledAt: addHours(
        candles[spec.settlement.settledAtCandleIndex].openTime,
        1,
      ).toISOString(),
      candleSeries: candles.slice(
        spec.settlement.fromCandleIndex,
        spec.settlement.toCandleIndex + 1,
      ),
      side: spec.plan.side,
      notes: spec.settlement.notes,
    });

    seededRecords.push({
      recordId: record.id,
      traderName: trader.name,
      rawContent: record.rawContent,
      outcomeLabels: syncedOutcomes.map((outcome) => outcome.resultLabel),
    });
  }

  const candidateCount = await rebuildStrategyCandidates(db);
  const chartOutcomeCount = await db.recordOutcome.count({
    where: {
      symbol: "BTC",
      timeframe: "1h",
    },
  });

  console.log(
    JSON.stringify(
      {
        seed: MOCK_SEED_ID,
        candles: candles.length,
        records: seededRecords,
        chartOutcomeCount,
        candidateCount,
      },
      null,
      2,
    ),
  );

  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error);

  const { db } = await import("@/lib/db");
  await db.$disconnect();
  process.exitCode = 1;
});
