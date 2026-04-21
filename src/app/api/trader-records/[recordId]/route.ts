import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { serializeRecord } from "@/modules/records/record-serializer";
import {
  TraderRecordMutationError,
  TraderRecordNotFoundError,
} from "@/modules/records/record-repository";
import {
  archiveRecordById,
  updateRecordFromInput,
} from "@/modules/records/record-service";
import { ensureResearchDeskSchema } from "@/lib/research-desk-schema-bootstrap";

const archiveRecordSchema = z
  .object({
    action: z.literal("archive"),
  })
  .strict();

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

function buildNotFoundResponse(error: TraderRecordNotFoundError) {
  return NextResponse.json(
    {
      error: "Trader record not found",
      recordId: error.recordId,
    },
    { status: 404 },
  );
}

function buildMutationErrorResponse(error: TraderRecordMutationError) {
  return NextResponse.json(
    {
      error: error.message,
    },
    { status: 409 },
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ recordId: string }> },
) {
  try {
    await ensureResearchDeskSchema();
    const { recordId } = await context.params;
    const payload = await request.json();

    if (
      typeof payload === "object" &&
      payload !== null &&
      "action" in payload &&
      (payload as { action?: unknown }).action === "archive"
    ) {
      archiveRecordSchema.parse(payload);
      const record = await archiveRecordById(recordId);

      return NextResponse.json({ record });
    }

    const record = await updateRecordFromInput(recordId, payload);
    return NextResponse.json({ record: serializeRecord(record) });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return buildBadRequestResponse(error);
    }

    if (error instanceof TraderRecordNotFoundError) {
      return buildNotFoundResponse(error);
    }

    if (error instanceof TraderRecordMutationError) {
      return buildMutationErrorResponse(error);
    }

    throw error;
  }
}
