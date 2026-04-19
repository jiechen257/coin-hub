import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import {
  OutcomeNotFoundError,
  outcomeRepository,
} from "@/modules/outcomes/outcome-repository";

const reviewTagPatchSchema = z
  .object({
    reviewTags: z.array(z.string().trim().min(1)),
  })
  .strict();

function buildBadRequestResponse(error: ZodError | SyntaxError) {
  return NextResponse.json(
    {
      error: "Invalid record outcome payload",
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

function buildNotFoundResponse(error: OutcomeNotFoundError) {
  return NextResponse.json(
    {
      error: "Record outcome not found",
      outcomeId: error.outcomeId,
    },
    { status: 404 },
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ outcomeId: string }> },
) {
  try {
    const { outcomeId } = await context.params;
    const body = reviewTagPatchSchema.parse(await request.json());
    const outcome = await outcomeRepository.replaceReviewTags(
      outcomeId,
      body.reviewTags,
    );

    return NextResponse.json({ outcome });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return buildBadRequestResponse(error);
    }

    if (error instanceof OutcomeNotFoundError) {
      return buildNotFoundResponse(error);
    }

    throw error;
  }
}
