// @vitest-environment node

import { buildBackfillArchivePlan } from "@/modules/market-data/backfill-historical-candles";

describe("backfill-historical-candles plan", () => {
  it("splits a mixed range into partial-month daily archives and full-month monthly archives", () => {
    const plan = buildBackfillArchivePlan({
      symbols: ["BTC"],
      timeframes: ["1h"],
      startDate: new Date(Date.UTC(2024, 0, 15)),
      endDate: new Date(Date.UTC(2024, 2, 2)),
    });

    expect(plan).toHaveLength(20);
    expect(plan.some((item) => item.path.endsWith("BTCUSDT-1h-2024-01-15.zip"))).toBe(true);
    expect(plan.some((item) => item.path.endsWith("BTCUSDT-1h-2024-02.zip"))).toBe(true);
    expect(plan.some((item) => item.path.endsWith("BTCUSDT-1h-2024-03-02.zip"))).toBe(true);
    expect(plan.some((item) => item.path.endsWith("BTCUSDT-1h-2024-01.zip"))).toBe(false);
    expect(plan.some((item) => item.path.endsWith("BTCUSDT-1h-2024-03.zip"))).toBe(false);
  });
});
