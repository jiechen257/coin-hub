import type { BuildSignalInput } from "@/modules/signals/build-trade-signal";

function clampConfidence(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function deriveConfidence(input: Pick<BuildSignalInput, "chanState" | "evidence">): number {
  let confidence = 0.35;

  if (input.chanState.trendBias === "up") {
    confidence += 0.35;
  } else if (input.chanState.trendBias === "down") {
    confidence += 0.15;
  }

  // Evidence gives the signal a small bump, but never lets it dominate structure.
  confidence += Math.min(input.evidence.length * 0.05, 0.15);

  return Math.round(clampConfidence(confidence) * 100) / 100;
}
