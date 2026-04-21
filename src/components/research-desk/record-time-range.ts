import type { ResearchDeskRecord } from "@/components/research-desk/research-desk-types";

export function getRecordStartedAt(record: Pick<ResearchDeskRecord, "startedAt" | "occurredAt">) {
  return record.startedAt ?? record.occurredAt;
}

export function getRecordEndedAt(
  record: Pick<ResearchDeskRecord, "startedAt" | "endedAt" | "occurredAt">,
) {
  return record.endedAt ?? record.startedAt ?? record.occurredAt;
}

function formatDateTime(
  value: string,
  options: Intl.DateTimeFormatOptions,
) {
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false,
    ...options,
  });
}

export function formatRecordTimeRange(
  record: Pick<ResearchDeskRecord, "startedAt" | "endedAt" | "occurredAt">,
) {
  const startedAt = getRecordStartedAt(record);
  const endedAt = getRecordEndedAt(record);

  if (startedAt === endedAt) {
    return formatDateTime(startedAt, {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const startDate = new Date(startedAt);
  const endDate = new Date(endedAt);
  const sameDay = startDate.toDateString() === endDate.toDateString();

  return sameDay
    ? `${formatDateTime(startedAt, {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })} - ${formatDateTime(endedAt, {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : `${formatDateTime(startedAt, {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })} - ${formatDateTime(endedAt, {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })}`;
}
