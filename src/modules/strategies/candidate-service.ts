type CandidatePlan = {
  marketContext?: string | null;
  triggerText: string;
  entryText: string;
  riskText?: string | null;
  exitText?: string | null;
};

type CandidateSample = {
  id: string;
  pnlPercent: number;
  resultTag: string;
  plan: CandidatePlan;
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function buildCandidateKey(plan: CandidatePlan) {
  return [
    normalize(plan.marketContext),
    normalize(plan.triggerText),
    normalize(plan.entryText),
    normalize(plan.riskText),
    normalize(plan.exitText),
  ].join("||");
}

export function buildStrategyCandidates(samples: CandidateSample[]) {
  const groups = new Map<string, CandidateSample[]>();

  for (const sample of samples) {
    const key = buildCandidateKey(sample.plan);
    const group = groups.get(key);

    if (group) {
      group.push(sample);
      continue;
    }

    groups.set(key, [sample]);
  }

  return [...groups.entries()].map(([key, group]) => ({
    key,
    marketContext: group[0]?.plan.marketContext ?? null,
    triggerText: group[0]!.plan.triggerText,
    entryText: group[0]!.plan.entryText,
    riskText: group[0]!.plan.riskText ?? null,
    exitText: group[0]!.plan.exitText ?? null,
    sampleCount: group.length,
    winRate:
      group.filter((sample) => sample.resultTag === "win").length / group.length,
    sampleIds: group.map((sample) => sample.id),
  }));
}
