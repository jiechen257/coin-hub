import { db } from "@/lib/db";
import { aggregateRunResult, type AssetAnalysis, type RunMode, type RunResult } from "@/modules/runs/result-aggregator";

export type RunInput = {
  mode: RunMode;
  strategyVersion?: string;
};

function analyzeSymbol(symbol: "BTC" | "ETH", input: RunInput): AssetAnalysis {
  const baseConfidence = symbol === "BTC" ? 0.74 : 0.71;

  return {
    symbol,
    confidence: input.mode === "scheduled" ? baseConfidence - 0.03 : baseConfidence,
    status: "ready",
    evidence: [`${symbol} baseline scan`, `mode:${input.mode}`],
  };
}

export async function runDualAssetAnalysis(input: RunInput): Promise<RunResult> {
  const btc = analyzeSymbol("BTC", input);
  const eth = analyzeSymbol("ETH", input);
  const aggregated = aggregateRunResult({
    mode: input.mode,
    strategyVersion: input.strategyVersion ?? "baseline-v1",
    btc,
    eth,
  });

  const snapshot = await db.runSnapshot.create({
    data: {
      mode: aggregated.mode,
      strategyVersion: aggregated.strategyVersion,
      warningsJson: aggregated.warnings,
      assetsJson: aggregated.assets,
      inputRefsJson: {
        mode: input.mode,
        symbols: ["BTC", "ETH"],
      },
      degradedAssetsJson: aggregated.degradedAssets,
    },
  });

  // Persist the snapshot so later replay evaluations can inspect the exact run output.
  return {
    ...aggregated,
    snapshotId: snapshot.id,
  };
}
