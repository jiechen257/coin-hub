import { NextResponse } from "next/server";
import {
  loadResearchDeskPayload,
  parseSymbol,
  parseTimeframe,
} from "@/components/research-desk/research-desk-data";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = parseSymbol(url.searchParams.get("symbol"));
  const timeframe = parseTimeframe(url.searchParams.get("timeframe"));

  return NextResponse.json(
    await loadResearchDeskPayload({
      symbol,
      timeframe,
    }),
  );
}
