"use client";

import type {
  ResearchDeskCandle,
  ResearchDeskRecord,
} from "@/components/research-desk/research-desk-types";
import type {
  RecordMorphology,
  RecordMorphologyItem,
} from "@/modules/records/record-morphology";
import type { ResearchChartTimeBounds } from "@/components/research-desk/research-chart-utils";

type ResearchChartMorphologyProps = {
  candles: ResearchDeskCandle[];
  timeBounds: ResearchChartTimeBounds;
  record: ResearchDeskRecord | null;
  chartHeightPx: number;
  priceToY?: (price: number) => number | null;
  activeMorphologyId?: string | null;
  onHighlightMorphology?: (id: string | null) => void;
};

type ResearchChartMorphologyLegendProps = {
  record: ResearchDeskRecord | null;
  activeMorphologyId?: string | null;
  onHighlightMorphology?: (id: string | null) => void;
};

type ResearchChartMorphologyTimeLanesProps = {
  record: ResearchDeskRecord | null;
  timeBounds: ResearchChartTimeBounds;
  activeMorphologyId?: string | null;
  onHighlightMorphology?: (id: string | null) => void;
};

type PriceBounds = {
  low: number;
  high: number;
  span: number;
};

type MorphologyTimeLaneKind = "trend" | "timeWindow";

type MorphologyTimeLaneEntry = {
  id: string;
  item: Extract<RecordMorphologyItem, { kind: MorphologyTimeLaneKind }>;
  leftPercent: number;
  widthPercent: number;
  displayIndex: number;
};

type MorphologyTimeLaneGroup = {
  kind: MorphologyTimeLaneKind;
  entries: MorphologyTimeLaneEntry[];
  rows: MorphologyTimeLaneEntry[][];
};

type MorphologyEntry = {
  id: string;
  item: RecordMorphologyItem;
  index: number;
};

type PriceLayerMorphologyItem = Exclude<
  RecordMorphologyItem,
  { kind: MorphologyTimeLaneKind }
>;

type PriceMorphologyEntry = MorphologyEntry & {
  item: PriceLayerMorphologyItem;
  displayIndex: number;
};

type PriceMarkerPlacement = PriceMorphologyEntry & {
  anchorX: number;
  anchorY: number;
  markerX: number;
  markerY: number;
};

const OVERLAY_KIND_PRIORITY: Record<RecordMorphologyItem["kind"], number> = {
  timeWindow: 0,
  trend: 1,
  pivotZone: 2,
  targetZone: 3,
  bi: 4,
  segment: 5,
  keyLevel: 6,
};

const MORPHOLOGY_KIND_LABELS: Record<RecordMorphologyItem["kind"], string> = {
  trend: "趋势",
  bi: "笔",
  segment: "段",
  pivotZone: "中枢",
  keyLevel: "关键位",
  targetZone: "目标区",
  timeWindow: "时间窗",
};

const MORPHOLOGY_DIRECTION_LABELS: Record<
  Extract<RecordMorphologyItem, { kind: "trend" }>["direction"],
  string
> = {
  up: "上涨",
  down: "下跌",
  range: "震荡",
};

const MIN_TIME_LANE_WIDTH_PERCENT = 8;
const TIME_LANE_GAP_PERCENT = 1.5;
const PRICE_LABEL_HEIGHT = 6.4;
const PRICE_MARKER_HEIGHT = 5.4;
const PRICE_MARKER_WIDTH = 5.4;
const PRICE_MARKER_RIGHT_X = 96.4;
const PRICE_MARKER_MIN_GAP = 7.2;
const PRICE_MARKER_TOP = 4;
const PRICE_MARKER_BOTTOM = 96;
const SHANGHAI_TIME_ZONE = "Asia/Shanghai";

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function getTimePercent(value: string, bounds: ResearchChartTimeBounds) {
  const timestampMs = new Date(value).getTime();
  return clampPercent(((timestampMs - bounds.startMs) / bounds.spanMs) * 100);
}

function collectMorphologyPrices(morphology: RecordMorphology) {
  return morphology.items.flatMap((item) => {
    switch (item.kind) {
      case "bi":
      case "segment":
        return [item.startPrice, item.endPrice];
      case "pivotZone":
      case "targetZone":
        return [item.lowPrice, item.highPrice];
      case "keyLevel":
        return [item.price];
      default:
        return [];
    }
  });
}

function buildPriceBounds(
  candles: ResearchDeskCandle[],
  morphology: RecordMorphology,
): PriceBounds {
  const candlePrices = candles.flatMap((candle) => [candle.low, candle.high]);
  const prices = [...candlePrices, ...collectMorphologyPrices(morphology)];

  if (prices.length === 0) {
    return {
      low: 0,
      high: 1,
      span: 1,
    };
  }

  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const rawSpan = high - low;
  const padding = rawSpan === 0 ? Math.max(high * 0.02, 1) : rawSpan * 0.06;
  const paddedLow = Math.max(low - padding, 0);
  const paddedHigh = high + padding;

  return {
    low: paddedLow,
    high: paddedHigh,
    span: Math.max(paddedHigh - paddedLow, 1),
  };
}

function getPricePercentFromBounds(price: number, bounds: PriceBounds) {
  return clampPercent(((bounds.high - price) / bounds.span) * 100);
}

function getPricePercent(
  price: number,
  chartHeightPx: number,
  bounds: PriceBounds,
  priceToY?: (price: number) => number | null,
) {
  const actualY = priceToY?.(price);

  if (actualY !== null && actualY !== undefined) {
    return clampPercent((actualY / chartHeightPx) * 100);
  }

  return getPricePercentFromBounds(price, bounds);
}

function formatMorphologyLabel(item: RecordMorphologyItem) {
  return item.label;
}

function getMorphologyKindLabel(item: RecordMorphologyItem) {
  return MORPHOLOGY_KIND_LABELS[item.kind];
}

function resolveTone(item: RecordMorphologyItem) {
  if (item.tone) {
    return item.tone;
  }

  if (item.kind === "trend") {
    return item.direction === "up"
      ? "bullish"
      : item.direction === "down"
        ? "bearish"
        : "neutral";
  }

  if (item.kind === "bi" || item.kind === "segment") {
    return item.endPrice >= item.startPrice ? "bullish" : "bearish";
  }

  return "neutral";
}

function getStrokeColor(item: RecordMorphologyItem) {
  const tone = resolveTone(item);

  if (tone === "bullish") {
    return "var(--chart-bull)";
  }

  if (tone === "bearish") {
    return "var(--chart-bear)";
  }

  return "rgba(15, 23, 42, 0.76)";
}

function getFillColor(item: RecordMorphologyItem) {
  const tone = resolveTone(item);

  if (tone === "bullish") {
    return "color-mix(in srgb, var(--chart-bull) 16%, white)";
  }

  if (tone === "bearish") {
    return "color-mix(in srgb, var(--chart-bear) 14%, white)";
  }

  return "rgba(148, 163, 184, 0.16)";
}

function buildMorphologyEntryId(item: RecordMorphologyItem, index: number) {
  return `${item.kind}-${index}`;
}

function getMorphologyEntries(morphology: RecordMorphology) {
  return morphology.items.map((item, index) => ({
    id: buildMorphologyEntryId(item, index),
    item,
    index,
  })) satisfies MorphologyEntry[];
}

function isPriceLayerItem(
  item: RecordMorphologyItem,
): item is PriceLayerMorphologyItem {
  return item.kind !== "trend" && item.kind !== "timeWindow";
}

function getPriceMorphologyEntries(morphology: RecordMorphology) {
  return getMorphologyEntries(morphology)
    .filter(
      (
        entry,
      ): entry is MorphologyEntry & {
        item: PriceLayerMorphologyItem;
      } => isPriceLayerItem(entry.item),
    )
    .map((entry, displayIndex) => ({
      ...entry,
      displayIndex: displayIndex + 1,
    })) satisfies PriceMorphologyEntry[];
}

function resolveMorphologyOpacity(
  entryId: string,
  activeMorphologyId?: string | null,
) {
  if (!activeMorphologyId) {
    return 0.94;
  }

  return activeMorphologyId === entryId ? 1 : 0.2;
}

function estimatePriceLabelWidth(text: string) {
  return Math.max(12, Math.min(text.length * 1.85 + 4.5, 36));
}

function formatPriceOverlayLabel(item: RecordMorphologyItem) {
  return `${getMorphologyKindLabel(item)} ${item.label}`;
}

function formatMorphologyIndex(value: number) {
  return value.toString().padStart(2, "0");
}

function formatMorphologyDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: SHANGHAI_TIME_ZONE,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatMorphologyTimeRange(
  item: Extract<RecordMorphologyItem, { kind: MorphologyTimeLaneKind }>,
) {
  return `${formatMorphologyDateTime(item.startAt)} - ${formatMorphologyDateTime(item.endAt)}`;
}

function formatMorphologyDuration(
  item: Extract<RecordMorphologyItem, { kind: MorphologyTimeLaneKind }>,
) {
  const durationMs =
    new Date(item.endAt).getTime() - new Date(item.startAt).getTime();
  const durationMinutes = Math.max(1, Math.round(durationMs / (1000 * 60)));
  const days = Math.floor(durationMinutes / (60 * 24));
  const hours = Math.floor((durationMinutes % (60 * 24)) / 60);
  const minutes = durationMinutes % 60;
  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}天`);
  }

  if (hours > 0) {
    parts.push(`${hours}小时`);
  }

  if (minutes > 0 && days === 0) {
    parts.push(`${minutes}分`);
  }

  return parts.join(" ") || "1分";
}

function getTimeLaneShortLabel(
  item: Extract<RecordMorphologyItem, { kind: MorphologyTimeLaneKind }>,
) {
  if (item.kind === "trend") {
    return MORPHOLOGY_DIRECTION_LABELS[item.direction];
  }

  return "时间窗";
}

function isTimeLaneItem(
  item: RecordMorphologyItem,
): item is Extract<RecordMorphologyItem, { kind: MorphologyTimeLaneKind }> {
  return item.kind === "trend" || item.kind === "timeWindow";
}

function buildMorphologyTimeLaneGroups(
  morphology: RecordMorphology,
  timeBounds: ResearchChartTimeBounds,
) {
  const groups = new Map<
    MorphologyTimeLaneKind,
    {
      entries: MorphologyTimeLaneEntry[];
      rows: Array<{ endPercent: number; items: MorphologyTimeLaneEntry[] }>;
    }
  >();
  const displayIndexMap = new Map<MorphologyTimeLaneKind, number>();

  const entries = getMorphologyEntries(morphology)
    .filter((entry): entry is MorphologyEntry & {
      item: Extract<RecordMorphologyItem, { kind: MorphologyTimeLaneKind }>;
    } => isTimeLaneItem(entry.item))
    .map((entry) => {
      const { item } = entry;
      const startX = getTimePercent(item.startAt, timeBounds);
      const endX = getTimePercent(item.endAt, timeBounds);
      const widthPercent = Math.max(
        Math.abs(endX - startX),
        MIN_TIME_LANE_WIDTH_PERCENT,
      );
      const leftPercent = clampPercent(
        Math.min(startX, endX),
      );
      const clampedLeftPercent = Math.max(
        0,
        Math.min(leftPercent, 100 - widthPercent),
      );
      const displayIndex = (displayIndexMap.get(item.kind) ?? 0) + 1;
      displayIndexMap.set(item.kind, displayIndex);

      return {
        id: entry.id,
        item,
        leftPercent: clampedLeftPercent,
        widthPercent,
        displayIndex,
      } satisfies MorphologyTimeLaneEntry;
    })
    .sort((left, right) => {
      if (left.item.kind !== right.item.kind) {
        return left.item.kind.localeCompare(right.item.kind);
      }

      return left.leftPercent - right.leftPercent;
    });

  for (const entry of entries) {
    const group = groups.get(entry.item.kind) ?? {
      entries: [],
      rows: [],
    };
    const rows = group.rows;

    group.entries.push(entry);

    const row = rows.find(
      (candidate) =>
        entry.leftPercent >= candidate.endPercent + TIME_LANE_GAP_PERCENT,
    );

    if (row) {
      row.items.push(entry);
      row.endPercent = entry.leftPercent + entry.widthPercent;
      groups.set(entry.item.kind, group);
      continue;
    }

    rows.push({
      endPercent: entry.leftPercent + entry.widthPercent,
      items: [entry],
    });
    groups.set(entry.item.kind, group);
  }

  return (["trend", "timeWindow"] as const)
    .map((kind) => {
      const group = groups.get(kind);

      if (!group) {
        return null;
      }

      return {
        kind,
        entries: group.entries,
        rows: group.rows.map((row) => row.items),
      } satisfies MorphologyTimeLaneGroup;
    })
    .filter((group) => group !== null)
    .filter((group) => group.rows.length > 0) satisfies MorphologyTimeLaneGroup[];
}

function resolvePriceMarkerAnchor(
  entry: PriceMorphologyEntry,
  timeBounds: ResearchChartTimeBounds,
  priceBounds: PriceBounds,
  chartHeightPx: number,
  priceToY?: (price: number) => number | null,
) {
  const { item } = entry;

  if (item.kind === "keyLevel") {
    const y = getPricePercent(item.price, chartHeightPx, priceBounds, priceToY);
    const x1 = item.startAt ? getTimePercent(item.startAt, timeBounds) : 0;
    const x2 = item.endAt ? getTimePercent(item.endAt, timeBounds) : 100;

    return {
      anchorX: Math.max(x1, Math.min(x2, PRICE_MARKER_RIGHT_X - 8)),
      anchorY: y,
    };
  }

  if (item.kind === "pivotZone" || item.kind === "targetZone") {
    const startX = getTimePercent(item.startAt, timeBounds);
    const endX = getTimePercent(item.endAt, timeBounds);
    const top = getPricePercent(item.highPrice, chartHeightPx, priceBounds, priceToY);
    const bottom = getPricePercent(item.lowPrice, chartHeightPx, priceBounds, priceToY);

    return {
      anchorX: Math.min(Math.max(startX, endX), PRICE_MARKER_RIGHT_X - 8),
      anchorY: (top + bottom) / 2,
    };
  }

  const startX = getTimePercent(item.startAt, timeBounds);
  const endX = getTimePercent(item.endAt, timeBounds);
  const startY = getPricePercent(item.startPrice, chartHeightPx, priceBounds, priceToY);
  const endY = getPricePercent(item.endPrice, chartHeightPx, priceBounds, priceToY);

  return {
    anchorX: Math.min(Math.max(startX, endX), PRICE_MARKER_RIGHT_X - 8),
    anchorY: endY ?? startY,
  };
}

function buildPriceMarkerPlacements(
  entries: PriceMorphologyEntry[],
  timeBounds: ResearchChartTimeBounds,
  priceBounds: PriceBounds,
  chartHeightPx: number,
  priceToY?: (price: number) => number | null,
) {
  const sortedEntries = entries
    .map((entry) => ({
      ...entry,
      ...resolvePriceMarkerAnchor(entry, timeBounds, priceBounds, chartHeightPx, priceToY),
    }))
    .sort((left, right) => left.anchorY - right.anchorY);

  if (sortedEntries.length === 0) {
    return [] satisfies PriceMarkerPlacement[];
  }

  const markerYs = sortedEntries.map((entry) =>
    Math.max(PRICE_MARKER_TOP, Math.min(PRICE_MARKER_BOTTOM, entry.anchorY)),
  );

  for (let index = 1; index < markerYs.length; index += 1) {
    markerYs[index] = Math.max(
      markerYs[index],
      markerYs[index - 1] + PRICE_MARKER_MIN_GAP,
    );
  }

  if (markerYs[markerYs.length - 1] > PRICE_MARKER_BOTTOM) {
    markerYs[markerYs.length - 1] = PRICE_MARKER_BOTTOM;

    for (let index = markerYs.length - 2; index >= 0; index -= 1) {
      markerYs[index] = Math.min(
        markerYs[index],
        markerYs[index + 1] - PRICE_MARKER_MIN_GAP,
      );
    }
  }

  if (markerYs[0] < PRICE_MARKER_TOP) {
    const shift = PRICE_MARKER_TOP - markerYs[0];

    for (let index = 0; index < markerYs.length; index += 1) {
      markerYs[index] = Math.min(PRICE_MARKER_BOTTOM, markerYs[index] + shift);
    }
  }

  return sortedEntries.map((entry, index) => ({
    ...entry,
    markerX: PRICE_MARKER_RIGHT_X,
    markerY: markerYs[index],
  })) satisfies PriceMarkerPlacement[];
}

function renderMorphologyItem(
  entry: PriceMorphologyEntry,
  timeBounds: ResearchChartTimeBounds,
  priceBounds: PriceBounds,
  chartHeightPx: number,
  priceToY?: (price: number) => number | null,
  activeMorphologyId?: string | null,
) {
  const { id, item } = entry;
  const stroke = getStrokeColor(item);
  const fill = getFillColor(item);
  const opacity = resolveMorphologyOpacity(id, activeMorphologyId);

  if (item.kind === "keyLevel") {
    const y = getPricePercent(item.price, chartHeightPx, priceBounds, priceToY);
    const x1 = item.startAt ? getTimePercent(item.startAt, timeBounds) : 0;
    const x2 = item.endAt ? getTimePercent(item.endAt, timeBounds) : 100;

    return (
      <g
        data-slot="research-chart-morphology-item"
        data-kind={item.kind}
        data-active={activeMorphologyId === id ? "true" : "false"}
        opacity={opacity}
      >
        <line
          x1={x1}
          y1={y}
          x2={x2}
          y2={y}
          stroke={stroke}
          strokeWidth={activeMorphologyId === id ? 0.78 : 0.58}
          strokeDasharray="3 1.6"
        />
      </g>
    );
  }

  if (item.kind === "pivotZone" || item.kind === "targetZone") {
    const startX = getTimePercent(item.startAt, timeBounds);
    const endX = getTimePercent(item.endAt, timeBounds);
    const x = Math.min(startX, endX);
    const width = Math.max(Math.abs(endX - startX), 1.2);
    const top = getPricePercent(item.highPrice, chartHeightPx, priceBounds, priceToY);
    const bottom = getPricePercent(item.lowPrice, chartHeightPx, priceBounds, priceToY);
    const y = Math.min(top, bottom);
    const height = Math.max(Math.abs(bottom - top), 1.2);

    return (
      <g
        data-slot="research-chart-morphology-item"
        data-kind={item.kind}
        data-active={activeMorphologyId === id ? "true" : "false"}
        opacity={opacity}
      >
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={1.2}
          fill={fill}
          stroke={stroke}
          strokeWidth={activeMorphologyId === id ? 0.58 : 0.4}
          strokeDasharray={item.kind === "targetZone" ? "1.6 1" : undefined}
        />
      </g>
    );
  }

  const startX = getTimePercent(item.startAt, timeBounds);
  const endX = getTimePercent(item.endAt, timeBounds);
  const startY = getPricePercent(item.startPrice, chartHeightPx, priceBounds, priceToY);
  const endY = getPricePercent(item.endPrice, chartHeightPx, priceBounds, priceToY);

  return (
    <g
      data-slot="research-chart-morphology-item"
      data-kind={item.kind}
      data-active={activeMorphologyId === id ? "true" : "false"}
      opacity={opacity}
    >
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke={stroke}
        strokeWidth={activeMorphologyId === id ? 0.92 : 0.72}
        strokeDasharray={item.kind === "segment" ? "2 1" : undefined}
      />
      <circle cx={startX} cy={startY} r={0.95} fill={stroke} />
      <circle cx={endX} cy={endY} r={1.05} fill={stroke} />
    </g>
  );
}

function compareOverlayItems(
  left: { item: RecordMorphologyItem; index: number },
  right: { item: RecordMorphologyItem; index: number },
) {
  const priorityDelta =
    OVERLAY_KIND_PRIORITY[left.item.kind] - OVERLAY_KIND_PRIORITY[right.item.kind];

  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  return left.index - right.index;
}

export function ResearchChartMorphologyLegend({
  record,
  activeMorphologyId = null,
  onHighlightMorphology,
}: ResearchChartMorphologyLegendProps) {
  const morphology = record?.morphology ?? null;

  if (!morphology || morphology.items.length === 0) {
    return null;
  }

  const priceEntries = getPriceMorphologyEntries(morphology);

  if (priceEntries.length === 0) {
    return null;
  }

  return (
    <section
      className="grid gap-2 rounded-md border border-border/80 bg-secondary/20 p-3"
      data-slot="research-chart-morphology-legend"
      aria-label="形态层"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">价格对象</p>
        <p className="text-xs text-muted-foreground">{priceEntries.length} 项</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {priceEntries.map((entry) => {
          const stroke = getStrokeColor(entry.item);
          const isActive = activeMorphologyId === entry.id;

          return (
            <button
              key={entry.id}
              type="button"
              className="flex min-h-12 min-w-[10rem] max-w-[18rem] items-start gap-2 rounded-md border border-border/80 bg-background/92 px-3 py-2 text-left shadow-[0_10px_24px_-22px_rgba(15,23,42,0.45)] transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-[1px]"
              data-slot="research-chart-morphology-chip"
              data-active={isActive ? "true" : "false"}
              onMouseEnter={() => onHighlightMorphology?.(entry.id)}
              onMouseLeave={() => onHighlightMorphology?.(null)}
              onFocus={() => onHighlightMorphology?.(entry.id)}
              onBlur={() => onHighlightMorphology?.(null)}
              style={{
                borderColor: isActive ? stroke : undefined,
                boxShadow: isActive
                  ? "0 12px 24px -20px rgba(15,23,42,0.42)"
                  : undefined,
              }}
            >
              <span
                className="mt-0.5 inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold"
                style={{
                  borderColor: stroke,
                  color: stroke,
                  backgroundColor: "rgba(255,255,255,0.96)",
                }}
              >
                {formatMorphologyIndex(entry.displayIndex)}
              </span>

              <div className="grid min-w-0 gap-1">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] leading-4 text-muted-foreground">
                  {entry.item.timeframe ? (
                    <span className="rounded-sm bg-secondary px-1.5 py-0.5">
                      {entry.item.timeframe}
                    </span>
                  ) : null}
                  <span className="rounded-sm border border-border/70 px-1.5 py-0.5">
                    {getMorphologyKindLabel(entry.item)}
                  </span>
                </div>
                <p className="break-words text-sm font-medium leading-5 text-foreground">
                  {formatMorphologyLabel(entry.item)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function ResearchChartMorphologyTimeLanes({
  record,
  timeBounds,
  activeMorphologyId = null,
  onHighlightMorphology,
}: ResearchChartMorphologyTimeLanesProps) {
  const morphology = record?.morphology ?? null;

  if (!morphology || morphology.items.length === 0) {
    return null;
  }

  const groups = buildMorphologyTimeLaneGroups(morphology, timeBounds);

  if (groups.length === 0) {
    return null;
  }

  return (
    <section
      className="grid gap-3"
      data-slot="research-chart-morphology-time-lanes"
      aria-label="形态时间轨道"
    >
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
          形态时间轨道
        </p>
        <p className="text-sm text-muted-foreground">
          完整语义放在上方卡片，定位条只回答对象发生在什么时间。
        </p>
      </div>

      {groups.map((group) => (
        <div key={group.kind} className="grid gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              {MORPHOLOGY_KIND_LABELS[group.kind]}轨道
            </p>
            <p className="text-xs text-muted-foreground">
              {group.rows.reduce((sum, row) => sum + row.length, 0)} 项
            </p>
          </div>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {group.entries.map((entry) => {
              const stroke = getStrokeColor(entry.item);
              const fill = getFillColor(entry.item);
              const isActive = activeMorphologyId === entry.id;

              return (
                <button
                  key={`${entry.id}-card`}
                  type="button"
                  className="grid gap-2 rounded-md border border-border/80 bg-background/96 p-3 text-left transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-[1px]"
                  data-slot="research-chart-morphology-time-card"
                  data-kind={entry.item.kind}
                  data-active={isActive ? "true" : "false"}
                  onMouseEnter={() => onHighlightMorphology?.(entry.id)}
                  onMouseLeave={() => onHighlightMorphology?.(null)}
                  onFocus={() => onHighlightMorphology?.(entry.id)}
                  onBlur={() => onHighlightMorphology?.(null)}
                  style={{
                    borderColor: isActive ? stroke : undefined,
                    boxShadow: isActive
                      ? "0 12px 24px -20px rgba(15,23,42,0.42)"
                      : undefined,
                    backgroundColor: isActive ? fill : undefined,
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border px-1 text-[11px] font-semibold"
                      style={{
                        borderColor: stroke,
                        color: stroke,
                        backgroundColor: "rgba(255,255,255,0.98)",
                      }}
                    >
                      {formatMorphologyIndex(entry.displayIndex)}
                    </span>

                    {entry.item.timeframe ? (
                      <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[11px] leading-4 text-muted-foreground">
                        {entry.item.timeframe}
                      </span>
                    ) : null}

                    <span className="rounded-sm border border-border/70 px-1.5 py-0.5 text-[11px] leading-4 text-muted-foreground">
                      {getMorphologyKindLabel(entry.item)}
                    </span>

                    <span
                      className="rounded-sm px-1.5 py-0.5 text-[11px] font-medium leading-4"
                      style={{
                        color: stroke,
                        backgroundColor: "rgba(255,255,255,0.72)",
                      }}
                    >
                      {getTimeLaneShortLabel(entry.item)}
                    </span>
                  </div>

                  <p className="text-sm font-medium leading-5 text-foreground">
                    {entry.item.label}
                  </p>

                  <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                    <div className="grid gap-1">
                      <span className="text-[11px] leading-4">开始</span>
                      <span data-slot="research-chart-morphology-time-card-start">
                        {formatMorphologyDateTime(entry.item.startAt)}
                      </span>
                    </div>
                    <div className="grid gap-1">
                      <span className="text-[11px] leading-4">结束</span>
                      <span data-slot="research-chart-morphology-time-card-end">
                        {formatMorphologyDateTime(entry.item.endAt)}
                      </span>
                    </div>
                    <div className="grid gap-1">
                      <span className="text-[11px] leading-4">持续</span>
                      <span data-slot="research-chart-morphology-time-card-duration">
                        {formatMorphologyDuration(entry.item)}
                      </span>
                    </div>
                  </div>

                  <p
                    className="text-[11px] leading-5 text-muted-foreground"
                    data-slot="research-chart-morphology-time-card-range"
                  >
                    {formatMorphologyTimeRange(entry.item)}
                  </p>
                </button>
              );
            })}
          </div>

          {group.rows.map((row, rowIndex) => (
            <div
              key={`${group.kind}-${rowIndex}`}
              className="research-lane-row"
              data-slot="research-chart-morphology-time-row"
            >
              <div
                className="research-lane-track"
                data-slot="research-chart-morphology-time-track"
              >
                {row.map((entry) => {
                  const stroke = getStrokeColor(entry.item);
                  const fill = getFillColor(entry.item);

                  const isActive = activeMorphologyId === entry.id;

                  return (
                    <button
                      key={entry.id}
                      type="button"
                      className="absolute inset-y-2 flex min-w-0 items-center gap-2 rounded-md border px-2.5 text-left transition-[box-shadow,transform,opacity] duration-150 hover:-translate-y-[1px]"
                      data-slot="research-chart-morphology-time-item"
                      data-kind={entry.item.kind}
                      data-active={isActive ? "true" : "false"}
                      title={entry.item.label}
                      onMouseEnter={() => onHighlightMorphology?.(entry.id)}
                      onMouseLeave={() => onHighlightMorphology?.(null)}
                      onFocus={() => onHighlightMorphology?.(entry.id)}
                      onBlur={() => onHighlightMorphology?.(null)}
                      style={{
                        left: `${entry.leftPercent}%`,
                        width: `${entry.widthPercent}%`,
                        borderColor: stroke,
                        backgroundColor: fill,
                        borderStyle:
                          entry.item.kind === "timeWindow" ? "dashed" : "solid",
                        opacity: resolveMorphologyOpacity(entry.id, activeMorphologyId),
                      }}
                    >
                      <span
                        className="inline-flex h-5 min-w-5 items-center justify-center rounded-[6px] border px-1 text-[10px] font-semibold"
                        style={{
                          borderColor: stroke,
                          color: stroke,
                          backgroundColor: "rgba(255,255,255,0.88)",
                        }}
                      >
                        {formatMorphologyIndex(entry.displayIndex)}
                      </span>
                      <span
                        className="truncate text-xs font-medium leading-5"
                        style={{ color: stroke }}
                      >
                        {getTimeLaneShortLabel(entry.item)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

export function ResearchChartMorphology({
  candles,
  timeBounds,
  record,
  chartHeightPx,
  priceToY,
  activeMorphologyId = null,
  onHighlightMorphology,
}: ResearchChartMorphologyProps) {
  const morphology = record?.morphology ?? null;

  if (!morphology || morphology.items.length === 0) {
    return null;
  }

  const priceBounds = buildPriceBounds(candles, morphology);
  const overlayItems = getPriceMorphologyEntries(morphology).sort(compareOverlayItems);
  const markerPlacements = buildPriceMarkerPlacements(
    overlayItems,
    timeBounds,
    priceBounds,
    chartHeightPx,
    priceToY,
  );

  return (
    <div
      className="research-chart-morphology-layer"
      data-slot="research-chart-morphology-layer"
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
        {overlayItems.map((entry) => (
          <g key={entry.id}>
            {renderMorphologyItem(
              entry,
              timeBounds,
              priceBounds,
              chartHeightPx,
              priceToY,
              activeMorphologyId,
            )}
          </g>
        ))}

        {markerPlacements.map((placement) => {
          const stroke = getStrokeColor(placement.item);
          const isActive = activeMorphologyId === placement.id;
          const detailText = formatPriceOverlayLabel(placement.item);
          const detailWidth = estimatePriceLabelWidth(detailText);
          const detailX = Math.max(
            1,
            Math.min(
              placement.markerX - detailWidth - 2,
              PRICE_MARKER_RIGHT_X - detailWidth - PRICE_MARKER_WIDTH - 1.2,
            ),
          );
          const detailY = Math.max(
            1,
            Math.min(
              98 - PRICE_LABEL_HEIGHT,
              placement.markerY - PRICE_LABEL_HEIGHT / 2,
            ),
          );

          return (
            <g
              key={`${placement.id}-marker`}
              data-slot="research-chart-morphology-marker"
              data-kind={placement.item.kind}
              data-active={isActive ? "true" : "false"}
              opacity={resolveMorphologyOpacity(placement.id, activeMorphologyId)}
              style={{ pointerEvents: "auto", cursor: "pointer" }}
              onMouseEnter={() => onHighlightMorphology?.(placement.id)}
              onMouseLeave={() => onHighlightMorphology?.(null)}
            >
              <line
                x1={placement.anchorX}
                y1={placement.anchorY}
                x2={placement.markerX - PRICE_MARKER_WIDTH / 2 - 0.8}
                y2={placement.markerY}
                stroke={stroke}
                strokeWidth={0.38}
                strokeDasharray="1.6 1.2"
              />

              <g transform={`translate(${placement.markerX - PRICE_MARKER_WIDTH / 2} ${placement.markerY - PRICE_MARKER_HEIGHT / 2})`}>
                <rect
                  width={PRICE_MARKER_WIDTH}
                  height={PRICE_MARKER_HEIGHT}
                  rx={1.7}
                  fill="rgba(255,255,255,0.98)"
                  stroke={stroke}
                  strokeWidth={isActive ? 0.5 : 0.35}
                />
                <text
                  x={PRICE_MARKER_WIDTH / 2}
                  y={3.5}
                  fill={stroke}
                  fontSize={2.4}
                  fontWeight={700}
                  textAnchor="middle"
                >
                  {formatMorphologyIndex(placement.displayIndex)}
                </text>
              </g>

              {isActive ? (
                <g
                  data-slot="research-chart-morphology-detail-label"
                  transform={`translate(${detailX} ${detailY})`}
                >
                  <rect
                    width={detailWidth}
                    height={PRICE_LABEL_HEIGHT}
                    rx={1.8}
                    fill="rgba(255,255,255,0.98)"
                    stroke={stroke}
                    strokeWidth={0.35}
                  />
                  <text
                    x={2}
                    y={4.2}
                    fill={stroke}
                    fontSize={2.8}
                    fontWeight={600}
                  >
                    {detailText}
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
