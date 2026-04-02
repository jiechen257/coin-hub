// @vitest-environment node

import { buildChanState } from "@/modules/chan/build-chan-state";

function makeTrendingCandles() {
  return [
    { symbol: "BTC", openTime: 1, open: 100, high: 110, low: 95, close: 108 },
    { symbol: "BTC", openTime: 2, open: 108, high: 118, low: 106, close: 115 },
  ];
}

it("derives symbol trend and segment summary from a rising candle sequence", () => {
  const state = buildChanState(makeTrendingCandles());

  expect(state.symbol).toBe("BTC");
  expect(state.trendBias).toBe("up");
  expect(state.segments).toHaveLength(1);
  expect(state.segments[0]).toMatchObject({
    direction: "up",
    startTime: 1,
    endTime: 2,
  });
  expect(state.structureSummary).toBe("趋势 up，共 1 段");
});

it("returns an empty placeholder state when no candles are provided", () => {
  const state = buildChanState([]);

  expect(state.symbol).toBeNull();
  expect(state.trendBias).toBe("sideways");
  expect(state.segments).toEqual([]);
  expect(state.structureSummary).toBe("暂无可用趋势结构");
});
