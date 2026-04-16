import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createRecordFromInput } from "@/modules/records/record-service";
import { ZodError } from "zod";

function buildBadRequestResponse(error: ZodError | SyntaxError) {
  return NextResponse.json(
    {
      error: "Invalid trader record payload",
      details:
        error instanceof ZodError
          ? error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            }))
          : [{ path: "", message: "Request body must be valid JSON" }],
    },
    { status: 400 },
  );
}

export async function GET() {
  const records = await db.traderRecord.findMany({
    include: { trader: true, executionPlans: { include: { sample: true } } },
    orderBy: { occurredAt: "desc" },
  });

  return NextResponse.json({ records });
}

export async function POST(request: Request) {
  try {
    const createdRecord = await createRecordFromInput(await request.json());
    const record = await db.traderRecord.findUniqueOrThrow({
      where: { id: createdRecord.id },
      include: {
        trader: true,
        executionPlans: {
          include: {
            sample: true,
          },
        },
      },
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return buildBadRequestResponse(error);
    }

    throw error;
  }
}
