import { NextResponse } from "next/server";
import { loadResearchDeskArchivePayload } from "@/components/research-desk/archive-analysis-data";
import {
  parseSymbol,
  parseTimeframe,
} from "@/components/research-desk/research-desk-chart-slice";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const payload = await loadResearchDeskArchivePayload({
    symbol: parseSymbol(url.searchParams.get("symbol")),
    timeframe: parseTimeframe(url.searchParams.get("timeframe")),
    recordId: url.searchParams.get("recordId") ?? undefined,
    traderId: url.searchParams.get("traderId") ?? undefined,
    reviewTag: url.searchParams.get("reviewTag") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
  });

  return NextResponse.json(payload);
}
