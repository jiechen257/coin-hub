import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createRecordFromInput } from "@/modules/records/record-service";

export async function GET() {
  const records = await db.traderRecord.findMany({
    include: { trader: true, executionPlans: { include: { sample: true } } },
    orderBy: { occurredAt: "desc" },
  });

  return NextResponse.json({ records });
}

export async function POST(request: Request) {
  const record = await createRecordFromInput(await request.json());
  return NextResponse.json({ record }, { status: 201 });
}
