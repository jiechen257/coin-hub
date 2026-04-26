import type { ResearchDeskRecord } from "@/components/research-desk/research-desk-types";

export type RecordStatus = "not_started" | "in_progress" | "ended" | "archived";
export type RecordStatusAction = "start" | "end" | "archive";

export type RecordCompletion = {
  missingBasics: string[];
  missingPlans: string[];
  missingReview: string[];
  score: number;
};

export class RecordStatusTransitionError extends Error {
  readonly currentStatus: RecordStatus;
  readonly nextStatus: RecordStatus;

  constructor(currentStatus: RecordStatus, nextStatus: RecordStatus) {
    super(`Cannot transition record from ${currentStatus} to ${nextStatus}.`);
    this.name = "RecordStatusTransitionError";
    this.currentStatus = currentStatus;
    this.nextStatus = nextStatus;
  }
}

export const RECORD_STATUS_LABELS = {
  not_started: "尚未开始",
  in_progress: "进行中",
  ended: "已结束",
  archived: "已归档",
} satisfies Record<RecordStatus, string>;

export const RECORD_STATUS_ACTION_LABELS = {
  start: "开始",
  end: "结束",
  archive: "归档",
} satisfies Record<RecordStatusAction, string>;

const ACTIVE_STATUS_ORDER: Record<RecordStatus, number> = {
  in_progress: 0,
  not_started: 1,
  ended: 2,
  archived: 3,
};

export function normalizeRecordStatus(
  value: string | null | undefined,
  archivedAt?: Date | string | null,
): RecordStatus {
  if (archivedAt) {
    return "archived";
  }

  switch (value) {
    case "not_started":
    case "in_progress":
    case "ended":
    case "archived":
      return value;
    default:
      return "not_started";
  }
}

export function getRecordStatusAction(status: RecordStatus): RecordStatusAction | null {
  switch (status) {
    case "not_started":
      return "start";
    case "in_progress":
      return "end";
    case "ended":
      return "archive";
    case "archived":
      return null;
  }
}

export function getNextRecordStatusForAction(
  status: RecordStatus,
  action: RecordStatusAction,
): RecordStatus {
  if (action === "start" && status === "not_started") {
    return "in_progress";
  }

  if (action === "end" && status === "in_progress") {
    return "ended";
  }

  if (action === "archive" && (status === "ended" || status === "archived")) {
    return "archived";
  }

  throw new RecordStatusTransitionError(
    status,
    action === "start"
      ? "in_progress"
      : action === "end"
        ? "ended"
        : "archived",
  );
}

export function assertRecordStatusTransition(
  currentStatus: RecordStatus,
  nextStatus: RecordStatus,
) {
  if (currentStatus === nextStatus) {
    return;
  }

  if (currentStatus === "not_started" && nextStatus === "in_progress") {
    return;
  }

  if (currentStatus === "in_progress" && nextStatus === "ended") {
    return;
  }

  throw new RecordStatusTransitionError(currentStatus, nextStatus);
}

export function deriveRecordStatus(input: {
  status?: string | null;
  archivedAt?: Date | string | null;
  hasSettledSample?: boolean;
  hasCompletedOutcome?: boolean;
  hasPendingOutcome?: boolean;
}): RecordStatus {
  if (input.archivedAt) {
    return "archived";
  }

  const normalized = normalizeRecordStatus(input.status, null);

  if (input.status && normalized !== "not_started") {
    return normalized;
  }

  if (input.hasSettledSample || input.hasCompletedOutcome) {
    return "ended";
  }

  if (input.hasPendingOutcome) {
    return "in_progress";
  }

  return normalized;
}

function hasText(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

export function buildRecordCompletion(
  record: Pick<
    ResearchDeskRecord,
    | "traderId"
    | "symbol"
    | "startedAt"
    | "endedAt"
    | "rawContent"
    | "executionPlans"
    | "archiveSummary"
    | "status"
  >,
): RecordCompletion {
  const missingBasics: string[] = [];
  const missingPlans: string[] = [];
  const missingReview: string[] = [];

  if (!hasText(record.traderId)) {
    missingBasics.push("交易员");
  }

  if (!hasText(record.symbol)) {
    missingBasics.push("标的");
  }

  if (!hasText(record.startedAt)) {
    missingBasics.push("开始时间");
  }

  if (!hasText(record.endedAt)) {
    missingBasics.push("结束时间");
  }

  if (!hasText(record.rawContent)) {
    missingBasics.push("原始记录");
  }

  if (record.executionPlans.length === 0) {
    missingPlans.push("执行方案");
  }

  record.executionPlans.forEach((plan, index) => {
    const prefix = record.executionPlans.length > 1 ? `方案 ${index + 1}` : "方案";

    if (!hasText(plan.triggerText)) {
      missingPlans.push(`${prefix}触发`);
    }

    if (!hasText(plan.entryText)) {
      missingPlans.push(`${prefix}入场`);
    }

    if (!hasText(plan.riskText)) {
      missingPlans.push(`${prefix}风控`);
    }

    if (!hasText(plan.exitText)) {
      missingPlans.push(`${prefix}离场`);
    }

    if (!plan.sample && record.status !== "not_started") {
      missingReview.push(`${prefix}结算`);
    }
  });

  if (record.status === "archived" && !hasText(record.archiveSummary)) {
    missingReview.push("归档总结");
  }

  const missingCount =
    missingBasics.length + missingPlans.length + missingReview.length;
  const score = Math.max(0, Math.round(((12 - missingCount) / 12) * 100));

  return {
    missingBasics,
    missingPlans,
    missingReview,
    score,
  };
}

export function selectPreferredRecordId(records: ResearchDeskRecord[]) {
  const candidates = records.filter((record) => record.status !== "archived");

  return [...candidates].sort((left, right) => {
    const statusDelta =
      ACTIVE_STATUS_ORDER[left.status] - ACTIVE_STATUS_ORDER[right.status];

    if (statusDelta !== 0) {
      return statusDelta;
    }

    return (
      new Date(right.startedAt ?? right.occurredAt).getTime() -
      new Date(left.startedAt ?? left.occurredAt).getTime()
    );
  })[0]?.id ?? null;
}
