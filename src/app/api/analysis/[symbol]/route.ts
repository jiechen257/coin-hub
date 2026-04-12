import { NextResponse } from "next/server";
import { loadAnalysisPayload } from "@/components/analysis/analysis-data";

type AnalysisRouteContext = {
  params: Promise<{
    symbol: string;
  }>;
};

export async function GET(request: Request, context: AnalysisRouteContext) {
  const { symbol } = await context.params;
  const url = new URL(request.url);

  // Keep the route focused on a single symbol/timeframe slice for the research view.
  const payload = await loadAnalysisPayload({
    symbol,
    timeframe: url.searchParams.get("timeframe"),
  });

  return NextResponse.json(payload);
}

