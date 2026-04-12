import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    runId: string;
  }>;
};

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

export async function GET(_request: Request, { params }: RouteContext) {
  const { runId } = await params;
  const run = await db.runSnapshot.findUnique({
    where: { id: runId },
  });

  if (!run) {
    return NextResponse.json({ error: "未找到运行快照" }, { status: 404 });
  }

  return NextResponse.json({
    run: mapRunSnapshot(run),
  });
}
