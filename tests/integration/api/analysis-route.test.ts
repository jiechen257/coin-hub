// @vitest-environment node

import { GET } from "@/app/api/analysis/[symbol]/route";

it("returns chart markers, viewpoints, and the selected asset signal", async () => {
  const response = await GET(new Request("http://localhost"), {
    params: Promise.resolve({ symbol: "BTC" }),
  } as never);
  const data = await response.json();

  expect(data.chart.candles.length).toBeGreaterThan(0);
  expect(data.chart.structureMarkers.length).toBeGreaterThan(0);
  expect(data.viewpoints.length).toBeGreaterThan(0);
  expect(data.signal.symbol).toBe("BTC");
});
