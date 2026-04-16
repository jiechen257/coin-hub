import { db } from "@/lib/db";
import { candleRepository } from "@/modules/market-data/candle-repository";

type ResearchDeskSelection = {
  symbol: "BTC" | "ETH";
  timeframe: "15m" | "1h" | "4h" | "1d";
};

export async function loadResearchDeskPayload(input: ResearchDeskSelection) {
  const [traders, records, candidates, candles] = await Promise.all([
    db.traderProfile.findMany({
      orderBy: { name: "asc" },
    }),
    db.traderRecord.findMany({
      include: {
        trader: true,
        executionPlans: {
          include: {
            sample: true,
          },
        },
      },
      orderBy: { occurredAt: "desc" },
      take: 20,
    }),
    db.strategyCandidate.findMany({
      include: {
        samples: {
          include: {
            sample: {
              include: {
                plan: {
                  include: {
                    record: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ sampleCount: "desc" }, { updatedAt: "desc" }],
    }),
    candleRepository.listCandles({
      symbol: input.symbol,
      timeframe: input.timeframe,
    }),
  ]);

  return {
    selection: input,
    traders,
    records,
    selectedRecordId: records[0]?.id ?? null,
    candidates,
    chart: {
      candles,
      markers: [],
    },
  };
}
