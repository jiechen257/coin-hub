import type { ChanState } from "@/modules/chan/types";
import { deriveConfidence } from "@/modules/signals/confidence";

export type TradeSignalBias = "long" | "wait";

export type BuildSignalInput = {
  chanState: ChanState;
  evidence: string[];
};

export type TradeSignal = {
  symbol: string;
  bias: TradeSignalBias;
  confidence: number;
  evidence: string[];
};

export function buildTradeSignal(input: BuildSignalInput): TradeSignal {
  if (input.chanState.symbol === null) {
    throw new Error("chanState symbol is required to build a trade signal");
  }

  return {
    symbol: input.chanState.symbol,
    bias: input.chanState.trendBias === "up" ? "long" : "wait",
    confidence: deriveConfidence(input),
    evidence: [...input.evidence],
  };
}
