// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startMarketDataSyncLoop } from "@/worker/market-data-sync";

describe("market-data-sync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete process.env.MARKET_DATA_SYNC_INTERVAL_MS;
  });

  it("runs one immediate sync and schedules the next tick", async () => {
    const sync = vi.fn().mockResolvedValue({ processedCandles: 8 });

    const handle = startMarketDataSyncLoop({ sync, intervalMs: 60_000 });

    expect(sync).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(60_000);

    expect(sync).toHaveBeenCalledTimes(2);
    handle.stop();
  });

  it("logs sync failures and still schedules the next tick", async () => {
    const sync = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({ processedCandles: 8 });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const handle = startMarketDataSyncLoop({ sync, intervalMs: 1_000 });

    await vi.runOnlyPendingTimersAsync();

    expect(errorSpy).toHaveBeenCalled();
    expect(sync).toHaveBeenCalledTimes(2);
    handle.stop();
  });

  it("reads the default interval from MARKET_DATA_SYNC_INTERVAL_MS", async () => {
    process.env.MARKET_DATA_SYNC_INTERVAL_MS = "500";

    const sync = vi.fn().mockResolvedValue({ processedCandles: 8 });
    const handle = startMarketDataSyncLoop({ sync });

    expect(sync).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(500);

    expect(sync).toHaveBeenCalledTimes(2);
    handle.stop();
  });
});
