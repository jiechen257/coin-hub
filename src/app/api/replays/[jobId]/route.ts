import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

type ReplaySummary = {
  snapshotCount: number;
  assetCount: number;
};

function mapReplayJob(record: {
  id: string;
  configVersionId: string | null;
  fromTime: Date;
  toTime: Date;
  status: string;
  resultJson: unknown;
  createdAt: Date;
  completedAt: Date | null;
  configVersion: { id: string; summary: string } | null;
}) {
  return {
    id: record.id,
    configVersionId: record.configVersionId,
    configVersionSummary: record.configVersion?.summary ?? null,
    fromTime: record.fromTime,
    toTime: record.toTime,
    status: record.status,
    result: (record.resultJson as ReplaySummary | null) ?? null,
    createdAt: record.createdAt,
    completedAt: record.completedAt,
  };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { jobId } = await params;
  const replay = await db.replayJob.findUnique({
    where: { id: jobId },
    include: {
      configVersion: {
        select: {
          id: true,
          summary: true,
        },
      },
    },
  });

  if (!replay) {
    return NextResponse.json({ error: "未找到回放任务" }, { status: 404 });
  }

  return NextResponse.json({
    replay: mapReplayJob(replay),
  });
}
