import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export type JobType = "analysis" | "replay";
export type JobStatus = "queued" | "processing" | "completed" | "failed";

export type JobRecord<TPayload = unknown> = {
  id: string;
  type: JobType;
  status: JobStatus;
  payload: TPayload;
  error: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
};

function mapJob<TPayload = unknown>(record: {
  id: string;
  type: string;
  status: string;
  payloadJson: Prisma.JsonValue;
  error: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}): JobRecord<TPayload> {
  return {
    id: record.id,
    type: record.type as JobType,
    status: record.status as JobStatus,
    payload: record.payloadJson as TPayload,
    error: record.error,
    createdAt: record.createdAt,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
  };
}

export async function enqueueJob(type: JobType, payload: unknown): Promise<JobRecord> {
  const job = await db.job.create({
    data: {
      type,
      payloadJson:
        payload === null ? Prisma.JsonNull : (payload as Prisma.InputJsonValue),
      status: "queued",
    },
  });

  return mapJob(job);
}

export async function claimNextJob(): Promise<JobRecord | null> {
  return db.$transaction(async (tx) => {
    const next = await tx.job.findFirst({
      where: { status: "queued" },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    if (!next) {
      return null;
    }

    const startedAt = new Date();
    const claimed = await tx.job.update({
      where: { id: next.id },
      data: {
        status: "processing",
        startedAt,
      },
    });

    return mapJob(claimed);
  });
}

export async function completeJob(jobId: string) {
  const completed = await db.job.update({
    where: { id: jobId },
    data: {
      status: "completed",
      completedAt: new Date(),
    },
  });

  return mapJob(completed);
}

export async function failJob(jobId: string, error: string) {
  const failed = await db.job.update({
    where: { id: jobId },
    data: {
      status: "failed",
      error,
      completedAt: new Date(),
    },
  });

  return mapJob(failed);
}
