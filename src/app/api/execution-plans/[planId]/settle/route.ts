import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "@/lib/db";
import { candleRepository } from "@/modules/market-data/candle-repository";
import { settleExecutionPlanInputSchema } from "@/modules/samples/sample-schema";
import { settleExecutionPlan } from "@/modules/samples/sample-service";

function buildBadRequestResponse(error: ZodError | SyntaxError) {
  return NextResponse.json(
    {
      error: "Invalid execution plan settlement payload",
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

export async function POST(
  request: Request,
  context: { params: Promise<{ planId: string }> },
) {
  try {
    const { planId } = await context.params;
    const body = settleExecutionPlanInputSchema.parse(await request.json());
    const plan = await db.executionPlan.findUniqueOrThrow({
      where: { id: planId },
      include: { record: true },
    });
    const candles = await candleRepository.listCandles({
      symbol: plan.record.symbol,
      timeframe: (plan.record.timeframe ?? "1h") as "15m" | "1h" | "4h" | "1d",
    });

    const sample = await settleExecutionPlan({
      planId,
      entryPrice: body.entryPrice,
      exitPrice: body.exitPrice,
      settledAt: body.settledAt,
      notes: body.notes,
      candleSeries: candles,
      side: plan.side as "long" | "short",
    });

    await db.executionPlan.update({
      where: { id: planId },
      data: {
        status: "settled",
        entryPrice: body.entryPrice,
        exitPrice: body.exitPrice,
      },
    });

    return NextResponse.json({ sample });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return buildBadRequestResponse(error);
    }

    throw error;
  }
}
