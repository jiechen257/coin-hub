import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  runDualAssetAnalysis,
  type RunInput,
} from "@/modules/runs/run-orchestrator";
import type { RunResult } from "@/modules/runs/result-aggregator";

type RunSnapshotRecord = {
  id: string;
  mode: string;
  strategyVersion: string;
  warningsJson: unknown;
  assetsJson: unknown;
  degradedAssetsJson: unknown;
};

function mapSnapshotToRunResult(snapshot: RunSnapshotRecord): RunResult {
  return {
    mode: snapshot.mode as RunResult["mode"],
    strategyVersion: snapshot.strategyVersion,
    warnings: Array.isArray(snapshot.warningsJson)
      ? (snapshot.warningsJson as string[])
      : [],
    assets: snapshot.assetsJson as RunResult["assets"],
    degradedAssets: Array.isArray(snapshot.degradedAssetsJson)
      ? (snapshot.degradedAssetsJson as string[])
      : [],
    snapshotId: snapshot.id,
  };
}

async function getLatestRunResult(): Promise<RunResult> {
  const latestSnapshot = await db.runSnapshot.findFirst({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  if (latestSnapshot) {
    // The dashboard should reflect the most recent persisted run without mutating state.
    return mapSnapshotToRunResult(latestSnapshot);
  }

  const input: RunInput = { mode: "manual" };
  return runDualAssetAnalysis(input);
}

export async function GET() {
  const latest = await getLatestRunResult();

  return NextResponse.json(latest);
}
