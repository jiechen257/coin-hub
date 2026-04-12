import { NextResponse } from "next/server";
import { evaluateReplay } from "@/modules/replay/replay-evaluator";
import { db } from "@/lib/db";

type ReplaySummary = {
  snapshotCount: number;
  assetCount: number;
};

function parseDate(value: string | undefined, fieldName: string) {
  if (!value) {
    throw new Error(`${fieldName} is required`);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} is invalid`);
  }

  return parsed;
}

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

export async function GET() {
  const replays = await db.replayJob.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      configVersion: {
        select: {
          id: true,
          summary: true,
        },
      },
    },
  });

  return NextResponse.json({
    replays: replays.map(mapReplayJob),
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      from?: string;
      to?: string;
      fromTime?: string;
      toTime?: string;
      configVersionId?: string | null;
      configVersion?: string | null;
    };

    const fromTime = parseDate(body.fromTime ?? body.from, "from");
    const toTime = parseDate(body.toTime ?? body.to, "to");
    const configVersionId = body.configVersionId ?? body.configVersion ?? null;

    // 直接复用 replay evaluator 生成可展示的 replay 记录，页面刷新后即可看到结果。
    const replay = await evaluateReplay({
      fromTime,
      toTime,
      configVersionId,
    });

    return NextResponse.json(
      {
        jobId: replay.id,
        replay,
      },
      { status: 202 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create replay job";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
