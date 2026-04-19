import { NextResponse } from "next/server";
import {
  parseSymbol,
  parseTimeframe,
  loadResearchDeskChartSlice,
} from "@/components/research-desk/research-desk-chart-slice";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = parseSymbol(url.searchParams.get("symbol"));
  const timeframe = parseTimeframe(url.searchParams.get("timeframe"));

  return NextResponse.json(
    await loadResearchDeskChartSlice({
      symbol,
      timeframe,
    }),
  );
}
