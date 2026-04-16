import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listSerializedStrategyCandidates } from "@/components/research-desk/research-desk-data";
import { buildStrategyCandidates } from "@/modules/strategies/candidate-service";

export async function GET() {
  const candidates = await listSerializedStrategyCandidates();
  return NextResponse.json({ candidates });
}

export async function POST() {
  const samples = await db.tradeSample.findMany({
    include: { plan: true },
  });
  const candidates = buildStrategyCandidates(samples);

  await db.$transaction(async (tx) => {
    await tx.strategyCandidateSample.deleteMany();
    await tx.strategyCandidate.deleteMany();

    for (const candidate of candidates) {
      const created = await tx.strategyCandidate.create({
        data: {
          marketContext: candidate.marketContext,
          triggerText: candidate.triggerText,
          entryText: candidate.entryText,
          riskText: candidate.riskText,
          exitText: candidate.exitText,
          sampleCount: candidate.sampleCount,
          winRate: candidate.winRate,
        },
      });

      await tx.strategyCandidateSample.createMany({
        data: candidate.sampleIds.map((sampleId) => ({
          candidateId: created.id,
          sampleId,
        })),
      });
    }
  });

  return NextResponse.json({
    regenerated: candidates.length,
    candidates: await listSerializedStrategyCandidates(),
  });
}
