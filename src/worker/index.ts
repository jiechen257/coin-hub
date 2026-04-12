import { fileURLToPath } from "node:url";
import { claimNextJob, completeJob, enqueueJob, failJob } from "@/modules/jobs/job-service";
import { evaluateReplay } from "@/modules/replay/replay-evaluator";
import { runDualAssetAnalysis } from "@/modules/runs/run-orchestrator";
import { startMarketDataSyncLoop } from "@/worker/market-data-sync";
import { processJob } from "@/worker/process-job";
import { startJobScheduler } from "@/worker/scheduler";

export { claimNextJob, completeJob, enqueueJob, failJob };
export { evaluateReplay } from "@/modules/replay/replay-evaluator";
export { runDualAssetAnalysis } from "@/modules/runs/run-orchestrator";
export { startMarketDataSyncLoop } from "@/worker/market-data-sync";
export { processJob } from "@/worker/process-job";
export { startJobScheduler } from "@/worker/scheduler";

/**
 * 只消费一次作业队列，给测试和一次性命令复用。
 */
export async function runWorkerOnce() {
  const job = await claimNextJob();

  if (!job) {
    return null;
  }

  return processJob(job);
}

/**
 * CLI 既支持单次消费作业，也支持常驻模式同时启动作业调度与行情同步。
 */
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
  startMarketDataSyncLoop();
  console.log("Worker scheduler and market data sync started.");

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
