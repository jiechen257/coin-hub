import type { CandleTimeframe } from "@/modules/market-data/normalize-candles";

export type OutcomeRecordType = "trade" | "view";

export type OutcomeProfile = {
  windowCandles: number;
  favorablePct: number;
  adversePct: number;
};

export const OUTCOME_RULE_VERSION = "v1";

export const OUTCOME_PROFILE_MAP = {
  trade: {
    "15m": { windowCandles: 32, favorablePct: 1.2, adversePct: -0.7 },
    "1h": { windowCandles: 24, favorablePct: 2.4, adversePct: -1.4 },
    "4h": { windowCandles: 18, favorablePct: 4.8, adversePct: -2.6 },
    "1d": { windowCandles: 10, favorablePct: 7.5, adversePct: -4.2 },
  },
  view: {
    "15m": { windowCandles: 24, favorablePct: 1.0, adversePct: -0.8 },
    "1h": { windowCandles: 20, favorablePct: 2.0, adversePct: -1.6 },
    "4h": { windowCandles: 16, favorablePct: 4.0, adversePct: -3.0 },
    "1d": { windowCandles: 8, favorablePct: 6.5, adversePct: -4.5 },
  },
} as const satisfies Record<OutcomeRecordType, Record<CandleTimeframe, OutcomeProfile>>;

export function getOutcomeProfile(
  recordType: OutcomeRecordType,
  timeframe: CandleTimeframe,
) {
  return OUTCOME_PROFILE_MAP[recordType][timeframe];
}
