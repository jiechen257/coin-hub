import { completeJob, failJob, type JobRecord } from "@/modules/jobs/job-service";
import { evaluateReplay, type ReplayEvaluationInput } from "@/modules/replay/replay-evaluator";
import { runDualAssetAnalysis, type RunInput } from "@/modules/runs/run-orchestrator";

type ProcessedJobResult =
  | { kind: "analysis"; result: Awaited<ReturnType<typeof runDualAssetAnalysis>> }
  | { kind: "replay"; result: Awaited<ReturnType<typeof evaluateReplay>> };

export async function processJob(job: JobRecord): Promise<ProcessedJobResult> {
  try {
    if (job.type === "analysis") {
      const result = await runDualAssetAnalysis(job.payload as RunInput);

      await completeJob(job.id);

      return {
        kind: "analysis",
        result,
      };
    }

    const result = await evaluateReplay(job.payload as ReplayEvaluationInput);

    await completeJob(job.id);

    return {
      kind: "replay",
      result,
    };
  } catch (error) {
    await failJob(job.id, error instanceof Error ? error.message : "Unknown job failure");
    throw error;
  }
}
