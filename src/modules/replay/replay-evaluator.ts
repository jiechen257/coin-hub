import { db } from "@/lib/db";

export type ReplayEvaluationInput = {
  fromTime: Date;
  toTime: Date;
  configVersionId?: string | null;
};

export type ReplayEvaluationSummary = {
  snapshotCount: number;
  assetCount: number;
};

export type ReplayEvaluationResult = {
  id: string;
  configVersionId: string | null;
  fromTime: Date;
  toTime: Date;
  status: "completed";
  result: ReplayEvaluationSummary;
  createdAt: Date;
  completedAt: Date | null;
};

function countAssets(assetsJson: unknown) {
  if (!assetsJson || typeof assetsJson !== "object") {
    return 0;
  }

  return Object.keys(assetsJson).length;
}

export async function evaluateReplay(input: ReplayEvaluationInput): Promise<ReplayEvaluationResult> {
  const snapshots = await db.runSnapshot.findMany({
    where: {
      createdAt: {
        gte: input.fromTime,
        lte: input.toTime,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const summary: ReplayEvaluationSummary = {
    snapshotCount: snapshots.length,
    assetCount: snapshots.reduce((total, snapshot) => total + countAssets(snapshot.assetsJson), 0),
  };

  const replayJob = await db.replayJob.create({
    data: {
      configVersionId: input.configVersionId ?? undefined,
      fromTime: input.fromTime,
      toTime: input.toTime,
      status: "completed",
      resultJson: summary,
      completedAt: new Date(),
    },
  });

  return {
    id: replayJob.id,
    configVersionId: replayJob.configVersionId,
    fromTime: replayJob.fromTime,
    toTime: replayJob.toTime,
    status: "completed",
    result: summary,
    createdAt: replayJob.createdAt,
    completedAt: replayJob.completedAt,
  };
}
