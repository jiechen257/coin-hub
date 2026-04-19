import type { ResearchDeskRecord } from "@/components/research-desk/research-desk-types";

const LEVEL_PATTERN = /\b\d{4,6}(?:-\d{4,6})?\b/g;
const TIME_PATTERN =
  /(?:\d{1,2}月)?\d{1,2}(?:-\d{1,2})?号(?:晚间|早间|凌晨|午间|中午)?(?:\/\d{1,2}号(?:晚间|早间|凌晨|午间|中午)?)?/g;

function splitReadableLines(value: string | null | undefined) {
  return (value ?? "")
    .split(/\n+/)
    .map((line) => line.replace(/^[\-\u2022]\s*/, "").trim())
    .filter(Boolean);
}

function uniqueMatches(text: string, pattern: RegExp, limit: number) {
  const matches = text.match(pattern) ?? [];
  return [...new Set(matches)].slice(0, limit);
}

function buildSummary(record: ResearchDeskRecord) {
  const noteLines = splitReadableLines(record.notes);

  if (noteLines.length > 0) {
    return noteLines.join(" ");
  }

  const priorityLine = splitReadableLines(record.rawContent).find((line) =>
    /(当前|目前).{0,6}>/.test(line),
  );

  if (priorityLine) {
    return priorityLine;
  }

  return record.executionPlans[0]?.marketContext ?? null;
}

export function buildPreviewText(record: ResearchDeskRecord) {
  return splitReadableLines(record.rawContent).join(" ");
}

export function extractRecordInsights(record: ResearchDeskRecord) {
  return {
    summary: buildSummary(record),
    keyLevels: uniqueMatches(record.rawContent, LEVEL_PATTERN, 8),
    timeNodes: uniqueMatches(record.rawContent, TIME_PATTERN, 6),
    previewText: buildPreviewText(record),
  };
}

export function formatPlanSide(side: "long" | "short") {
  return side === "long" ? "做多" : "做空";
}
