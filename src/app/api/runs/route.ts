import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type RunSummary = {
  symbol: "BTC" | "ETH";
  confidence: number;
  status: string;
  evidence: string[];
};

function mapRunSnapshot(record: {
  id: string;
  mode: string;
  strategyVersion: string;
  warningsJson: unknown;
  assetsJson: unknown;
  inputRefsJson: unknown;
  degradedAssetsJson: unknown;
  createdAt: Date;
}) {
  return {
    id: record.id,
    mode: record.mode,
    strategyVersion: record.strategyVersion,
    warnings: (record.warningsJson as string[]) ?? [],
    assets: record.assetsJson as Record<string, RunSummary>,
    inputRefs: record.inputRefsJson,
    degradedAssets: (record.degradedAssetsJson as string[]) ?? [],
    createdAt: record.createdAt,
  };
}

export async function GET() {
  const runs = await db.runSnapshot.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    runs: runs.map(mapRunSnapshot),
  });
}
