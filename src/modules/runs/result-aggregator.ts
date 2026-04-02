export type RunMode = "manual" | "scheduled";

export type AssetAnalysis = {
  symbol: "BTC" | "ETH";
  confidence: number;
  status: "ready";
  evidence: string[];
};

export type RunResult = {
  mode: RunMode;
  strategyVersion: string;
  assets: {
    BTC: AssetAnalysis;
    ETH: AssetAnalysis;
  };
  warnings: string[];
  degradedAssets: string[];
  snapshotId: string | null;
};

export type AggregateRunResultInput = {
  mode: RunMode;
  strategyVersion: string;
  btc: AssetAnalysis;
  eth: AssetAnalysis;
};

function deriveDegradedAssets(assets: RunResult["assets"]) {
  return (Object.entries(assets) as Array<["BTC" | "ETH", AssetAnalysis]>)
    .filter(([, asset]) => asset.confidence < 0.7)
    .map(([symbol]) => symbol);
}

export function aggregateRunResult(input: AggregateRunResultInput): RunResult {
  const assets = {
    BTC: input.btc,
    ETH: input.eth,
  };
  const degradedAssets = deriveDegradedAssets(assets);

  return {
    mode: input.mode,
    strategyVersion: input.strategyVersion,
    assets,
    warnings: degradedAssets.length > 0 ? [`降级资产：${degradedAssets.join(", ")}`] : [],
    degradedAssets,
    snapshotId: null,
  };
}
