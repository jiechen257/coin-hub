// @vitest-environment node

import { db } from "@/lib/db";
import { enqueueJob } from "@/modules/jobs/job-service";
import { runWorkerOnce } from "@/worker/index";

describe("worker index", () => {
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
});
