import { NextResponse } from "next/server";
import { createTraderProfile, listTraderProfiles } from "@/modules/traders/trader-repository";
import { ZodError, z } from "zod";

const createTraderSchema = z
  .object({
    name: z.string().trim().min(1),
    platform: z.string().trim().min(1).optional(),
    notes: z.string().trim().min(1).optional(),
  })
  .strict();

function buildBadRequestResponse(error: ZodError | SyntaxError) {
  return NextResponse.json(
    {
      error: "Invalid trader payload",
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
  const traders = await listTraderProfiles();
  return NextResponse.json({ traders });
}

export async function POST(request: Request) {
  try {
    const body = createTraderSchema.parse(await request.json());
    const trader = await createTraderProfile(body);

    return NextResponse.json({ trader }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return buildBadRequestResponse(error);
    }

    throw error;
  }
}
