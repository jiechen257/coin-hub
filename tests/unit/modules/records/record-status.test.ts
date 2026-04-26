// @vitest-environment node

import {
  RecordStatusTransitionError,
  assertRecordStatusTransition,
  buildRecordCompletion,
  deriveRecordStatus,
  getNextRecordStatusForAction,
  getRecordStatusAction,
  selectPreferredRecordId,
} from "@/modules/records/record-status";
import type { ResearchDeskRecord } from "@/components/research-desk/research-desk-types";

function createRecord(
  overrides: Partial<ResearchDeskRecord> = {},
): ResearchDeskRecord {
  return {
    id: "record-default",
    traderId: "trader-1",
    symbol: "BTC",
    timeframe: "1h",
    recordType: "view",
    status: "not_started",
    sourceType: "manual",
    occurredAt: "2026-04-20T00:00:00.000Z",
    startedAt: "2026-04-20T00:00:00.000Z",
    endedAt: "2026-04-20T01:00:00.000Z",
    archivedAt: null,
    archiveSummary: null,
    rawContent: "记录内容",
    notes: null,
    trader: {
      id: "trader-1",
      name: "交易员 A",
      platform: null,
      notes: null,
    },
    executionPlans: [
      {
        id: "plan-1",
        label: "plan-1",
        status: "draft",
        side: "long",
        entryPrice: null,
        exitPrice: null,
        stopLoss: null,
        takeProfit: null,
        marketContext: null,
        triggerText: "突破触发",
        entryText: "回踩入场",
        riskText: "跌破止损",
        exitText: "放量止盈",
        notes: null,
        sample: null,
      },
    ],
    completion: {
      missingBasics: [],
      missingPlans: [],
      missingReview: [],
      score: 100,
    },
    ...overrides,
  };
}

describe("record status helpers", () => {
  it("maps each record status to the only available next action", () => {
    expect(getRecordStatusAction("not_started")).toBe("start");
    expect(getRecordStatusAction("in_progress")).toBe("end");
    expect(getRecordStatusAction("ended")).toBe("archive");
    expect(getRecordStatusAction("archived")).toBeNull();
  });

  it("applies the manual transition matrix and rejects skipped states", () => {
    expect(getNextRecordStatusForAction("not_started", "start")).toBe(
      "in_progress",
    );
    expect(getNextRecordStatusForAction("in_progress", "end")).toBe("ended");
    expect(getNextRecordStatusForAction("ended", "archive")).toBe("archived");

    expect(() => assertRecordStatusTransition("not_started", "ended")).toThrow(
      RecordStatusTransitionError,
    );
  });

  it("derives legacy statuses from archived, completed, and pending signals", () => {
    expect(
      deriveRecordStatus({
        archivedAt: "2026-04-20T10:00:00.000Z",
        status: "not_started",
      }),
    ).toBe("archived");
    expect(deriveRecordStatus({ hasSettledSample: true })).toBe("ended");
    expect(deriveRecordStatus({ hasCompletedOutcome: true })).toBe("ended");
    expect(deriveRecordStatus({ hasPendingOutcome: true })).toBe("in_progress");
    expect(deriveRecordStatus({})).toBe("not_started");
  });

  it("selects the latest active record by lifecycle priority", () => {
    expect(
      selectPreferredRecordId([
        createRecord({
          id: "ended",
          status: "ended",
          startedAt: "2026-04-24T00:00:00.000Z",
          occurredAt: "2026-04-24T00:00:00.000Z",
        }),
        createRecord({
          id: "not-started",
          status: "not_started",
          startedAt: "2026-04-25T00:00:00.000Z",
          occurredAt: "2026-04-25T00:00:00.000Z",
        }),
        createRecord({
          id: "running-old",
          status: "in_progress",
          startedAt: "2026-04-20T00:00:00.000Z",
          occurredAt: "2026-04-20T00:00:00.000Z",
        }),
        createRecord({
          id: "running-new",
          status: "in_progress",
          startedAt: "2026-04-26T00:00:00.000Z",
          occurredAt: "2026-04-26T00:00:00.000Z",
        }),
      ]),
    ).toBe("running-new");
  });

  it("tracks basics, plan, and review completion gaps independently", () => {
    const completion = buildRecordCompletion(
      createRecord({
        status: "archived",
        traderId: "",
        endedAt: undefined,
        archiveSummary: "",
        executionPlans: [
          {
            id: "plan-1",
            label: "plan-1",
            status: "draft",
            side: "long",
            entryPrice: null,
            exitPrice: null,
            stopLoss: null,
            takeProfit: null,
            marketContext: null,
            triggerText: "",
            entryText: "入场",
            riskText: null,
            exitText: null,
            notes: null,
            sample: null,
          },
        ],
      }),
    );

    expect(completion.missingBasics).toEqual(
      expect.arrayContaining(["交易员", "结束时间"]),
    );
    expect(completion.missingPlans).toEqual(
      expect.arrayContaining(["方案触发", "方案风控", "方案离场"]),
    );
    expect(completion.missingReview).toEqual(
      expect.arrayContaining(["方案结算", "归档总结"]),
    );
    expect(completion.score).toBeLessThan(100);
  });
});
