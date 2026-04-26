import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { serializeRecord } from "@/modules/records/record-serializer";
import {
  TraderRecordMutationError,
  TraderRecordNotFoundError,
  TraderRecordStatusTransitionError,
} from "@/modules/records/record-repository";
import {
  archiveRecordById,
  setRecordStatusById,
  updateRecordArchiveSummaryById,
  updateRecordFromInput,
} from "@/modules/records/record-service";
import { ensureResearchDeskSchema } from "@/lib/research-desk-schema-bootstrap";

const archiveRecordSchema = z
  .object({
    action: z.literal("archive"),
  })
  .strict();
const setRecordStatusSchema = z
  .object({
    action: z.literal("set-status"),
    status: z.enum(["not_started", "in_progress", "ended"]),
  })
  .strict();
const updateArchiveSummarySchema = z
  .object({
    action: z.literal("update-archive-summary"),
    archiveSummary: z.string().optional().nullable(),
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

function buildStatusTransitionErrorResponse(error: TraderRecordStatusTransitionError) {
  return NextResponse.json(
    {
      error: error.message,
      recordId: error.recordId,
      currentStatus: error.currentStatus,
      nextStatus: error.nextStatus,
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

      return NextResponse.json({ record: serializeRecord(record) });
    }

    if (
      typeof payload === "object" &&
      payload !== null &&
      "action" in payload &&
      (payload as { action?: unknown }).action === "set-status"
    ) {
      const input = setRecordStatusSchema.parse(payload);
      const record = await setRecordStatusById(recordId, input.status);

      return NextResponse.json({ record: serializeRecord(record) });
    }

    if (
      typeof payload === "object" &&
      payload !== null &&
      "action" in payload &&
      (payload as { action?: unknown }).action === "update-archive-summary"
    ) {
      const input = updateArchiveSummarySchema.parse(payload);
      const record = await updateRecordArchiveSummaryById(
        recordId,
        input.archiveSummary?.trim() || null,
      );

      return NextResponse.json({ record: serializeRecord(record) });
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

    if (error instanceof TraderRecordStatusTransitionError) {
      return buildStatusTransitionErrorResponse(error);
    }

    throw error;
  }
}
