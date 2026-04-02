import type { RawTweet } from "@/modules/tweets/attribute-viewpoints";

export type LlmSummaryDependencies = {
  callModel?: (prompt: string) => Promise<string>;
};

export async function summarizeReasoning(tweet: RawTweet, dependencies: LlmSummaryDependencies = {}) {
  if (!dependencies.callModel) {
    return null;
  }

  try {
    // Keep the fallback soft so tweet ingestion never blocks on the model layer.
    return await dependencies.callModel(tweet.text);
  } catch {
    return null;
  }
}
