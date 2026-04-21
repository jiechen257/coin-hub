import type { CandlestickData, IRange, UTCTimestamp } from "lightweight-charts";
import type {
  ResearchDeskCandle,
  ResearchDeskOutcome,
} from "@/components/research-desk/research-desk-types";
import type { RecordMorphology } from "@/modules/records/record-morphology";
import {
  formatOutcomeResultLabel,
  formatOutcomeSubjectType,
  formatOutcomeWindowType,
} from "@/components/research-desk/outcome-copy";

const MIN_WINDOW_WIDTH_PERCENT = 1.5;
const MIN_LANE_WIDTH_PERCENT = 12;
const LANE_GAP_PERCENT = 1.5;

export type ResearchChartTimeBounds = {
  startMs: number;
  endMs: number;
  spanMs: number;
};

export type ResearchChartLaneItem = {
  id: string;
  outcome: ResearchDeskOutcome;
  label: string;
  meta: string;
  displayIndex: number;
  rowIndex: number;
  leftPercent: number;
  widthPercent: number;
  windowLeftPercent: number;
  windowWidthPercent: number;
};

export type ResearchChartLaneRow = {
  id: string;
  items: ResearchChartLaneItem[];
};

export function toUnixTimestamp(value: string | number): UTCTimestamp {
  const timestampMs = typeof value === "string" ? new Date(value).getTime() : value;
  return Math.floor(timestampMs / 1000) as UTCTimestamp;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function getTimestampMs(value: string) {
  return new Date(value).getTime();
}

function collectMorphologyTimePoints(morphology?: RecordMorphology | null) {
  if (!morphology) {
    return [];
  }

  return morphology.items.flatMap((item) => {
    switch (item.kind) {
      case "trend":
      case "bi":
      case "segment":
      case "pivotZone":
      case "targetZone":
      case "timeWindow":
        return [getTimestampMs(item.startAt), getTimestampMs(item.endAt)];
      case "keyLevel":
        return [
          ...(item.startAt ? [getTimestampMs(item.startAt)] : []),
          ...(item.endAt ? [getTimestampMs(item.endAt)] : []),
        ];
      default:
        return [];
    }
  });
}

function resolveBoundsRange(points: number[]) {
  const startMs = Math.min(...points);
  const endMs = Math.max(...points);

  if (startMs === endMs) {
    return {
      startMs,
      endMs: startMs + 60 * 60 * 1000,
      spanMs: 60 * 60 * 1000,
    };
  }

  return {
    startMs,
    endMs,
    spanMs: endMs - startMs,
  };
}

function getPercentForTimestamp(
  timestampMs: number,
  bounds: ResearchChartTimeBounds,
) {
  return clampPercent(((timestampMs - bounds.startMs) / bounds.spanMs) * 100);
}

function buildLaneLabel(outcome: ResearchDeskOutcome) {
  return `${formatOutcomeSubjectType(outcome.subjectType)} · ${formatOutcomeWindowType(outcome.windowType)}`;
}

function buildLaneMeta(outcome: ResearchDeskOutcome) {
  const tags = outcome.reviewTags.slice(0, 2).join(" / ");
  const resultText = formatOutcomeResultLabel(outcome.resultLabel);
  return tags.length > 0 ? `${resultText} · ${tags}` : resultText;
}

function buildLaneWindow(
  outcome: ResearchDeskOutcome,
  bounds: ResearchChartTimeBounds,
) {
  const startPercent = getPercentForTimestamp(
    getTimestampMs(outcome.windowStartAt),
    bounds,
  );
  const endPercent = getPercentForTimestamp(
    getTimestampMs(outcome.windowEndAt),
    bounds,
  );
  const rawWidthPercent = Math.max(endPercent - startPercent, MIN_WINDOW_WIDTH_PERCENT);
  const widthPercent = Math.min(rawWidthPercent, 100);
  const windowLeftPercent = clampPercent(
    Math.min(startPercent, 100 - widthPercent),
  );
  const centerPercent = windowLeftPercent + widthPercent / 2;
  const visualWidthPercent = Math.min(
    Math.max(widthPercent, MIN_LANE_WIDTH_PERCENT),
    100,
  );
  const leftPercent = clampPercent(
    Math.min(centerPercent - visualWidthPercent / 2, 100 - visualWidthPercent),
  );

  return {
    leftPercent,
    widthPercent: visualWidthPercent,
    windowLeftPercent,
    windowWidthPercent: widthPercent,
  };
}

export function toCandlestickSeriesData(
  candles: ResearchDeskCandle[],
): CandlestickData[] {
  return candles.map((candle) => ({
    time: toUnixTimestamp(candle.openTime),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  }));
}

export function toTimeScaleRange(
  bounds: ResearchChartTimeBounds,
): IRange<UTCTimestamp> {
  return {
    from: toUnixTimestamp(bounds.startMs),
    to: toUnixTimestamp(bounds.endMs),
  };
}

export function buildResearchChartTimeBounds(
  candles: ResearchDeskCandle[],
  outcomes: ResearchDeskOutcome[],
  morphology?: RecordMorphology | null,
): ResearchChartTimeBounds {
  const points = [
    ...candles.map((candle) => getTimestampMs(candle.openTime)),
    ...outcomes.flatMap((outcome) => [
      getTimestampMs(outcome.windowStartAt),
      getTimestampMs(outcome.windowEndAt),
    ]),
    ...collectMorphologyTimePoints(morphology),
  ];

  if (points.length === 0) {
    return resolveBoundsRange([Date.now()]);
  }

  return resolveBoundsRange(points);
}

export function buildOutcomeLaneRows(
  outcomes: ResearchDeskOutcome[],
  bounds: ResearchChartTimeBounds,
): ResearchChartLaneRow[] {
  const rows: Array<{ endPercent: number; items: ResearchChartLaneItem[] }> = [];
  const sortedOutcomes = [...outcomes].sort((left, right) => {
    const startGap =
      getTimestampMs(left.windowStartAt) - getTimestampMs(right.windowStartAt);

    if (startGap !== 0) {
      return startGap;
    }

    return getTimestampMs(left.windowEndAt) - getTimestampMs(right.windowEndAt);
  });

  for (const [displayIndex, outcome] of sortedOutcomes.entries()) {
    const laneWindow = buildLaneWindow(outcome, bounds);
    const rowIndex = rows.findIndex(
      (row) => laneWindow.leftPercent >= row.endPercent + LANE_GAP_PERCENT,
    );
    const nextRowIndex = rowIndex === -1 ? rows.length : rowIndex;
    const item: ResearchChartLaneItem = {
      id: outcome.id,
      outcome,
      label: buildLaneLabel(outcome),
      meta: buildLaneMeta(outcome),
      displayIndex: displayIndex + 1,
      rowIndex: nextRowIndex,
      leftPercent: laneWindow.leftPercent,
      widthPercent: laneWindow.widthPercent,
      windowLeftPercent: laneWindow.windowLeftPercent,
      windowWidthPercent: laneWindow.windowWidthPercent,
    };

    if (!rows[nextRowIndex]) {
      rows[nextRowIndex] = {
        endPercent: laneWindow.leftPercent + laneWindow.widthPercent,
        items: [item],
      };
      continue;
    }

    rows[nextRowIndex].items.push(item);
    rows[nextRowIndex].endPercent =
      laneWindow.leftPercent + laneWindow.widthPercent;
  }

  return rows.map((row, index) => ({
    id: `lane-row-${index + 1}`,
    items: row.items,
  }));
}

export function findOutcomeLaneItem(
  rows: ResearchChartLaneRow[],
  outcomeId: string | null,
) {
  if (!outcomeId) {
    return null;
  }

  for (const row of rows) {
    const target = row.items.find((item) => item.id === outcomeId);

    if (target) {
      return target;
    }
  }

  return null;
}
