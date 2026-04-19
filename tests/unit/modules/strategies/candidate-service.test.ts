// @vitest-environment node

import { buildStrategyCandidates } from "@/modules/strategies/candidate-service";

describe("candidate-service", () => {
  it("groups settled samples by normalized plan fields", () => {
    const candidates = buildStrategyCandidates([
      {
        id: "sample-1",
        pnlPercent: 2,
        resultTag: "win",
        plan: {
          marketContext: "trend",
          triggerText: "follow breakout",
          entryText: "enter on reclaim",
          riskText: "stop below swing",
          exitText: "exit at prior high",
        },
      },
      {
        id: "sample-2",
        pnlPercent: -1,
        resultTag: "loss",
        plan: {
          marketContext: "trend",
          triggerText: "follow breakout",
          entryText: "enter on reclaim",
          riskText: "stop below swing",
          exitText: "exit at prior high",
        },
      },
    ]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.sampleCount).toBe(2);
    expect(candidates[0]?.winRate).toBe(0.5);
  });
});
