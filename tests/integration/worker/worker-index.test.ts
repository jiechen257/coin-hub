// @vitest-environment node

import { afterEach, vi } from "vitest";
import { db } from "@/lib/db";
import { enqueueJob } from "@/modules/jobs/job-service";
import { runWorkerOnce } from "@/worker/index";

describe("worker index", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    await db.job.deleteMany();
    await db.runSnapshot.deleteMany();
  });

  afterEach(async () => {
    await db.job.deleteMany();
    await db.runSnapshot.deleteMany();
  });

  it("claims the oldest queued analysis job and completes it", async () => {
    const queued = await enqueueJob("analysis", { mode: "manual" });

    const processed = await runWorkerOnce();
    const storedJob = await db.job.findUnique({
      where: { id: queued.id },
    });
    const snapshots = await db.runSnapshot.findMany();

    expect(processed?.kind).toBe("analysis");
    expect(storedJob?.status).toBe("completed");
    expect(snapshots).toHaveLength(1);
  });

  it("starts both scheduler loops in long-running mode", async () => {
    const startJobScheduler = vi.fn(() => ({ stop: vi.fn() }));
    const startMarketDataSyncLoop = vi.fn(() => ({ stop: vi.fn() }));

    vi.doMock("@/modules/jobs/job-service", () => ({
      claimNextJob: vi.fn(),
      completeJob: vi.fn(),
      enqueueJob: vi.fn(),
      failJob: vi.fn(),
    }));
    vi.doMock("@/worker/process-job", () => ({
      processJob: vi.fn(),
    }));
    vi.doMock("@/worker/scheduler", () => ({
      startJobScheduler,
    }));
    vi.doMock("@/worker/market-data-sync", () => ({
      startMarketDataSyncLoop,
    }));

    const { runWorkerCli } = await import("@/worker/index");

    void runWorkerCli([]);
    await Promise.resolve();

    expect(startJobScheduler).toHaveBeenCalledTimes(1);
    expect(startMarketDataSyncLoop).toHaveBeenCalledTimes(1);
  });

  it("keeps --once mode on the existing job-only path", async () => {
    const claimNextJob = vi.fn().mockResolvedValue(null);
    const startJobScheduler = vi.fn(() => ({ stop: vi.fn() }));
    const startMarketDataSyncLoop = vi.fn(() => ({ stop: vi.fn() }));

    vi.doMock("@/modules/jobs/job-service", () => ({
      claimNextJob,
      completeJob: vi.fn(),
      enqueueJob: vi.fn(),
      failJob: vi.fn(),
    }));
    vi.doMock("@/worker/process-job", () => ({
      processJob: vi.fn(),
    }));
    vi.doMock("@/worker/scheduler", () => ({
      startJobScheduler,
    }));
    vi.doMock("@/worker/market-data-sync", () => ({
      startMarketDataSyncLoop,
    }));

    const { runWorkerCli } = await import("@/worker/index");

    const result = await runWorkerCli(["--once"]);

    expect(result).toBeNull();
    expect(claimNextJob).toHaveBeenCalledTimes(1);
    expect(startJobScheduler).not.toHaveBeenCalled();
    expect(startMarketDataSyncLoop).not.toHaveBeenCalled();
  });
});
