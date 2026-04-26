import { NextResponse } from "next/server";
import { serializeRecord } from "@/modules/records/record-serializer";
import {
  createRecordFromInput,
  listRecordsFromInput,
} from "@/modules/records/record-service";
import { ZodError } from "zod";
import { db } from "@/lib/db";
import { ensureResearchDeskSchema } from "@/lib/research-desk-schema-bootstrap";

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

const SUPPORTED_RECORD_STATUSES = new Set([
  "not_started",
  "in_progress",
  "ended",
  "archived",
  "all",
]);
const SUPPORTED_SYMBOLS = new Set(["BTC", "ETH"]);

export async function GET(
  request: Request = new Request("http://localhost/api/trader-records"),
) {
  await ensureResearchDeskSchema();
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const symbol = url.searchParams.get("symbol");
  const traderId = url.searchParams.get("traderId");
  const records = await listRecordsFromInput({
    status: SUPPORTED_RECORD_STATUSES.has(status ?? "")
      ? (status as "not_started" | "in_progress" | "ended" | "archived" | "all")
      : undefined,
    symbol: SUPPORTED_SYMBOLS.has(symbol ?? "") ? (symbol as "BTC" | "ETH") : undefined,
    traderId: traderId || undefined,
  });

  return NextResponse.json({ records: records.map(serializeRecord) });
}

export async function POST(request: Request) {
  try {
    await ensureResearchDeskSchema();
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

    return NextResponse.json({ record: serializeRecord(record) }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return buildBadRequestResponse(error);
    }

    throw error;
  }
}
