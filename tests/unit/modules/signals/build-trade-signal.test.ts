// @vitest-environment node

import { buildChanState } from "@/modules/chan/build-chan-state";
import { buildTradeSignal } from "@/modules/signals/build-trade-signal";

it("builds a long signal from an upward chan state", () => {
  const chanState = buildChanState([
    { symbol: "BTC", openTime: 1, open: 100, high: 110, low: 95, close: 108 },
    { symbol: "BTC", openTime: 2, open: 108, high: 118, low: 106, close: 115 },
  ]);

  const signal = buildTradeSignal({
    chanState,
    evidence: ["trend up"],
  });

  expect(signal.symbol).toBe("BTC");
  expect(signal.bias).toBe("long");
  expect(signal.confidence).toBe(0.75);
  expect(signal.evidence).toEqual(["trend up"]);
});

it("builds a wait signal from a non-upward chan state", () => {
  const chanState = buildChanState([
    { symbol: "ETH", openTime: 1, open: 100, high: 101, low: 94, close: 96 },
    { symbol: "ETH", openTime: 2, open: 96, high: 97, low: 90, close: 92 },
  ]);

  const signal = buildTradeSignal({
    chanState,
    evidence: [],
  });

  expect(signal.symbol).toBe("ETH");
  expect(signal.bias).toBe("wait");
  expect(signal.confidence).toBe(0.5);
});
