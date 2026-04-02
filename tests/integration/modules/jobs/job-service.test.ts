// @vitest-environment node

import { db } from "@/lib/db";
import { claimNextJob, enqueueJob } from "@/modules/jobs/job-service";

describe("job-service", () => {
  beforeEach(async () => {
    await db.job.deleteMany();
  });

  afterEach(async () => {
    await db.job.deleteMany();
  });

  it("enqueues analysis jobs and lets the worker claim the oldest queued job", async () => {
    const queued = await enqueueJob("analysis", { mode: "manual" });
    const claimed = await claimNextJob();

    const stored = await db.job.findUnique({
      where: { id: queued.id },
    });

    expect(queued.status).toBe("queued");
    expect(claimed?.id).toBe(queued.id);
    expect(claimed?.status).toBe("processing");
    expect(claimed?.startedAt).toBeInstanceOf(Date);
    expect(stored?.type).toBe("analysis");
  });
});
