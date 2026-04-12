import { claimNextJob } from "@/modules/jobs/job-service";
import { processJob } from "@/worker/process-job";

export type JobSchedulerOptions = {
  intervalMs?: number;
};

export type JobSchedulerHandle = {
  stop: () => void;
};

export function startJobScheduler(options: JobSchedulerOptions = {}): JobSchedulerHandle {
  const intervalMs = options.intervalMs ?? 2000;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const stop = () => {
    stopped = true;

    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const tick = async () => {
    if (stopped) {
      return;
    }

    try {
      const job = await claimNextJob();

      if (job) {
        await processJob(job);
      }
    } catch {
      // Individual jobs already persist their failure state; keep the scheduler loop alive.
    }

    if (!stopped) {
      timer = setTimeout(() => {
        void tick();
      }, intervalMs);
    }
  };

  timer = setTimeout(() => {
    void tick();
  }, 0);

  return { stop };
}
