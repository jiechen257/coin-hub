import { NextResponse } from "next/server";
import { enqueueJob } from "@/modules/jobs/job-service";

export async function POST(request: Request) {
  let strategyVersion: string | undefined;

  const bodyText = await request.text();
  if (bodyText.trim().length > 0) {
    try {
      const body = JSON.parse(bodyText) as { strategyVersion?: unknown };

      if (typeof body.strategyVersion === "string") {
        strategyVersion = body.strategyVersion;
      }
    } catch {
      // The command center can submit an empty body; invalid JSON should not block the manual run.
    }
  }

  const job = await enqueueJob("analysis", {
    mode: "manual",
    ...(strategyVersion ? { strategyVersion } : {}),
  });

  return NextResponse.json({ job }, { status: 201 });
}
