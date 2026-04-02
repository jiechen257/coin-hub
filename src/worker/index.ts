import { fileURLToPath } from "node:url";
import { claimNextJob, completeJob, enqueueJob, failJob } from "@/modules/jobs/job-service";
import { evaluateReplay } from "@/modules/replay/replay-evaluator";
import { runDualAssetAnalysis } from "@/modules/runs/run-orchestrator";
import { processJob } from "@/worker/process-job";
import { startJobScheduler } from "@/worker/scheduler";

export { claimNextJob, completeJob, enqueueJob, failJob };
export { evaluateReplay } from "@/modules/replay/replay-evaluator";
export { runDualAssetAnalysis } from "@/modules/runs/run-orchestrator";
export { processJob } from "@/worker/process-job";
export { startJobScheduler } from "@/worker/scheduler";

export async function runWorkerOnce() {
  const job = await claimNextJob();

  if (!job) {
    return null;
  }

  return processJob(job);
}

export async function runWorkerCli(args: string[] = process.argv.slice(2)) {
  if (args.includes("--once")) {
    const processed = await runWorkerOnce();

    if (!processed) {
      console.log("No queued jobs.");
      return null;
    }

    console.log(`Processed ${processed.kind} job.`);
    return processed;
  }

  // Keep the module usable as a long-running worker when started from the CLI.
  startJobScheduler();
  console.log("Worker scheduler started.");

  return new Promise<never>(() => {});
}

const isDirectExecution =
  typeof process.argv[1] === "string" &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectExecution) {
  void runWorkerCli().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
