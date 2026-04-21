"use client";

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CandlestickSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import { findRecordForOutcome } from "@/components/research-desk/research-desk-filtering";
import type {
  ResearchDeskCandle,
  ResearchDeskOutcome,
  ResearchDeskRecord,
  ResearchDeskSymbol,
  ResearchDeskTimeframe,
} from "@/components/research-desk/research-desk-types";
import {
  buildOutcomeLaneRows,
  buildResearchChartTimeBounds,
  findOutcomeLaneItem,
  toTimeScaleRange,
  toCandlestickSeriesData,
} from "@/components/research-desk/research-chart-utils";
import { formatOutcomeResultLabel } from "@/components/research-desk/outcome-copy";
import {
  ResearchChartMorphologyLegend,
  ResearchChartMorphologyTimeLanes,
} from "@/components/research-desk/research-chart-morphology";
import { ResearchChartTimePopover } from "@/components/research-desk/research-chart-time-popover";
import { cn } from "@/lib/utils";

const CHART_HEIGHT_PX = 320;
const CHART_FALLBACK_WIDTH_PX = 960;
const CHART_PRICE_SCALE_WIDTH_PX = 88;

type ResearchChartHandle = {
  chart: IChartApi;
  candleSeries: ISeriesApi<"Candlestick", Time>;
};

type ResearchChartProps = {
  candles: ResearchDeskCandle[];
  outcomes: ResearchDeskOutcome[];
  records: ResearchDeskRecord[];
  activeRecord?: ResearchDeskRecord | null;
  selectedOutcomeId: string | null;
  onSelectOutcome: (outcomeId: string) => void;
  symbol?: ResearchDeskSymbol;
  timeframe?: ResearchDeskTimeframe;
  className?: string;
};

function readChartColor(variableName: string, fallback: string) {
  if (typeof window === "undefined") {
    return fallback;
  }

  const value = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();

  return value || fallback;
}

function getChartWidth(width: number) {
  return width > 0 ? width : CHART_FALLBACK_WIDTH_PX;
}

function buildChartOptions(width: number) {
  return {
    width: getChartWidth(width),
    height: CHART_HEIGHT_PX,
    layout: {
      background: { color: readChartColor("--chart-panel", "rgb(255, 255, 255)") },
      textColor: readChartColor("--chart-text", "rgba(15, 23, 42, 0.92)"),
    },
    grid: {
      vertLines: {
        color: readChartColor("--chart-grid", "rgba(15, 23, 42, 0.08)"),
      },
      horzLines: {
        color: readChartColor("--chart-grid", "rgba(15, 23, 42, 0.08)"),
      },
    },
    crosshair: {
      vertLine: {
        color: readChartColor("--chart-crosshair", "rgba(15, 23, 42, 0.18)"),
      },
      horzLine: {
        color: readChartColor("--chart-crosshair", "rgba(15, 23, 42, 0.18)"),
      },
    },
    rightPriceScale: {
      borderColor: readChartColor("--chart-grid-strong", "rgba(15, 23, 42, 0.14)"),
      minimumWidth: CHART_PRICE_SCALE_WIDTH_PX,
    },
    timeScale: {
      borderColor: readChartColor("--chart-grid-strong", "rgba(15, 23, 42, 0.14)"),
      timeVisible: true,
      secondsVisible: false,
    },
  } as const;
}

function buildCandlestickOptions() {
  const bullColor = readChartColor("--chart-bull", "rgb(22, 163, 74)");
  const bearColor = readChartColor("--chart-bear", "rgb(220, 38, 38)");

  return {
    upColor: bullColor,
    downColor: bearColor,
    wickVisible: true,
    borderVisible: true,
    borderUpColor: bullColor,
    borderDownColor: bearColor,
    wickUpColor: bullColor,
    wickDownColor: bearColor,
  } as const;
}

function createResearchChartHandle(host: HTMLDivElement): ResearchChartHandle {
  const chart = createChart(host, buildChartOptions(host.clientWidth));
  const candleSeries = chart.addSeries(CandlestickSeries, buildCandlestickOptions());

  return {
    chart,
    candleSeries,
  };
}

function resizeResearchChart(
  chartHandle: ResearchChartHandle,
  nextWidth: number,
) {
  chartHandle.chart.resize(getChartWidth(nextWidth), CHART_HEIGHT_PX);
}

type ResearchChartHeaderProps = {
  symbol?: ResearchDeskSymbol;
  timeframe?: ResearchDeskTimeframe;
};

function ResearchChartHeader({
  symbol,
  timeframe,
}: ResearchChartHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
          本地研究图
        </p>
        <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
          <h2 className="text-3xl font-semibold text-foreground">研究时间轴</h2>
          <p className="text-sm text-muted-foreground">
            K 线主视图与结果轨道共用同一时间轴，点击轨道项即可联动选中。
          </p>
        </div>
      </div>

      {(symbol || timeframe) ? (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {symbol ? (
            <span className="rounded-md border border-border/80 bg-secondary/25 px-3 py-2">
              标的 {symbol}
            </span>
          ) : null}
          {timeframe ? (
            <span className="rounded-md border border-border/80 bg-secondary/25 px-3 py-2">
              周期 {timeframe}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function buildRecordTrackTitle(record: ResearchDeskRecord) {
  const title =
    record.rawContent
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? "未命名记录";

  return `${record.trader.name} · ${title}`;
}

const SHANGHAI_TIME_ZONE = "Asia/Shanghai";

function formatTrackDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: SHANGHAI_TIME_ZONE,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatTrackDuration(startAt: string, endAt: string) {
  const durationMs = Math.max(new Date(endAt).getTime() - new Date(startAt).getTime(), 0);
  const totalMinutes = Math.round(durationMs / (60 * 1000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  const segments: string[] = [];

  if (days > 0) {
    segments.push(`${days}天`);
  }

  if (hours > 0) {
    segments.push(`${hours}小时`);
  }

  if (minutes > 0 && days === 0) {
    segments.push(`${minutes}分`);
  }

  return segments.join(" ") || "1分";
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "--";
  }

  return `${value.toFixed(2)}%`;
}

function formatOutcomeStripLabel(resultLabel: ResearchDeskOutcome["resultLabel"]) {
  return formatOutcomeResultLabel(resultLabel);
}

type ResearchOutcomeLanesProps = {
  laneRows: ReturnType<typeof buildOutcomeLaneRows>;
  records: ResearchDeskRecord[];
  selectedOutcomeId: string | null;
  onSelectOutcome: (outcomeId: string) => void;
};

function ResearchOutcomeLanes({
  laneRows,
  records,
  selectedOutcomeId,
  onSelectOutcome,
}: ResearchOutcomeLanesProps) {
  const lanesRef = useRef<HTMLElement | null>(null);
  const [activePopoverOutcomeId, setActivePopoverOutcomeId] = useState<string | null>(
    null,
  );
  const laneItems = useMemo(
    () =>
      laneRows
        .flatMap((row) => row.items)
        .sort((left, right) => left.displayIndex - right.displayIndex),
    [laneRows],
  );

  useEffect(() => {
    if (!activePopoverOutcomeId) {
      return;
    }

    const hasActiveItem = laneRows.some((row) =>
      row.items.some((item) => item.id === activePopoverOutcomeId),
    );

    if (!hasActiveItem) {
      setActivePopoverOutcomeId(null);
    }
  }, [activePopoverOutcomeId, laneRows]);

  useEffect(() => {
    if (!activePopoverOutcomeId) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (lanesRef.current?.contains(event.target as Node)) {
        return;
      }

      setActivePopoverOutcomeId(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActivePopoverOutcomeId(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activePopoverOutcomeId]);

  function handleLaneClick(outcomeId: string) {
    setActivePopoverOutcomeId((current) =>
      current === outcomeId ? null : outcomeId,
    );
    onSelectOutcome(outcomeId);
  }

  return (
    <section ref={lanesRef} className="grid gap-2" aria-label="outcome 轨道">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
            结果轨道
          </p>
          <p className="text-sm text-muted-foreground">
            完整结果放在上方卡片，定位条只负责回答结果发生在什么时间。
          </p>
        </div>
      </div>

      {laneRows.length > 0 ? (
        <>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {laneItems.map((item) => {
              const isSelected = item.id === selectedOutcomeId;
              const matchedRecord = findRecordForOutcome(records, item.outcome);
              const trackTitle = matchedRecord
                ? buildRecordTrackTitle(matchedRecord)
                : item.label;
              const resultText = formatOutcomeResultLabel(item.outcome.resultLabel);

              return (
                <button
                  key={`${item.id}-card`}
                  type="button"
                  className="grid gap-2 rounded-md border border-border/80 bg-background/96 p-3 text-left transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-[1px]"
                  data-slot="research-chart-outcome-card"
                  data-result={item.outcome.resultLabel}
                  data-state={isSelected ? "selected" : "idle"}
                  aria-pressed={isSelected}
                  onClick={() => handleLaneClick(item.id)}
                >
                  <div className="flex flex-wrap items-center gap-2 text-[11px] leading-4">
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border/80 bg-white px-1 font-semibold text-foreground">
                      {item.displayIndex.toString().padStart(2, "0")}
                    </span>
                    <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-muted-foreground">
                      {item.outcome.timeframe}
                    </span>
                    <span className="rounded-sm border border-border/70 px-1.5 py-0.5 text-muted-foreground">
                      {item.label}
                    </span>
                    <span className="rounded-sm px-1.5 py-0.5 font-medium text-foreground/80">
                      {resultText}
                    </span>
                  </div>

                  <p
                    className="break-words text-sm font-medium leading-5 text-foreground"
                    data-slot="research-chart-outcome-card-title"
                  >
                    {trackTitle}
                  </p>

                  <p
                    className="text-xs leading-5 text-muted-foreground"
                    data-slot="research-chart-outcome-card-meta"
                  >
                    {item.meta}
                  </p>

                  <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-4">
                    <div className="grid gap-1">
                      <span className="text-[11px] leading-4">开始</span>
                      <span data-slot="research-chart-outcome-card-start">
                        {formatTrackDateTime(item.outcome.windowStartAt)}
                      </span>
                    </div>
                    <div className="grid gap-1">
                      <span className="text-[11px] leading-4">结束</span>
                      <span data-slot="research-chart-outcome-card-end">
                        {formatTrackDateTime(item.outcome.windowEndAt)}
                      </span>
                    </div>
                    <div className="grid gap-1">
                      <span className="text-[11px] leading-4">持续</span>
                      <span data-slot="research-chart-outcome-card-duration">
                        {formatTrackDuration(
                          item.outcome.windowStartAt,
                          item.outcome.windowEndAt,
                        )}
                      </span>
                    </div>
                    <div className="grid gap-1">
                      <span className="text-[11px] leading-4">窗口收益</span>
                      <span data-slot="research-chart-outcome-card-return">
                        {formatPercent(item.outcome.forwardReturnPercent)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {laneRows.map((row) => (
            <div
              key={row.id}
              className="research-lane-row"
              data-slot="research-chart-lane-row"
            >
              <div
                className="research-lane-track"
                data-slot="research-chart-lane-track"
              >
                {row.items.map((item) => {
                  const isSelected = item.id === selectedOutcomeId;
                  const resultText = formatOutcomeStripLabel(item.outcome.resultLabel);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="research-outcome-strip"
                      data-slot="research-chart-outcome-strip"
                      data-result={item.outcome.resultLabel}
                      data-state={isSelected ? "selected" : "idle"}
                      data-outcome-id={item.id}
                      aria-pressed={isSelected}
                      aria-label={`结果定位条 ${item.displayIndex.toString().padStart(2, "0")} ${resultText}`}
                      style={{
                        left: `${item.leftPercent}%`,
                        width: `${item.widthPercent}%`,
                      }}
                      onClick={() => handleLaneClick(item.id)}
                    >
                      <span className="research-outcome-strip-content">
                        <span className="research-outcome-strip-index">
                          {item.displayIndex.toString().padStart(2, "0")}
                        </span>
                        <span className="truncate text-xs font-medium leading-5">
                          {resultText}
                        </span>
                      </span>
                    </button>
                  );
                })}

                {(() => {
                  const activeItem =
                    row.items.find((item) => item.id === activePopoverOutcomeId) ?? null;

                  if (!activeItem) {
                    return null;
                  }

                  const matchedRecord = findRecordForOutcome(records, activeItem.outcome);
                  const trackTitle = matchedRecord
                    ? buildRecordTrackTitle(matchedRecord)
                    : activeItem.label;
                  const align =
                    activeItem.leftPercent + activeItem.widthPercent / 2 >= 50
                      ? "end"
                      : "start";
                  const popoverStyle =
                    align === "end"
                      ? {
                          right: `${100 - (activeItem.leftPercent + activeItem.widthPercent)}%`,
                        }
                      : {
                          left: `${activeItem.leftPercent}%`,
                        };

                  return (
                    <ResearchChartTimePopover
                      outcome={activeItem.outcome}
                      record={matchedRecord}
                      title={trackTitle}
                      align={align}
                      style={popoverStyle}
                    />
                  );
                })()}
              </div>
            </div>
          ))}
        </>
      ) : (
        <div className="rounded-md border border-dashed border-border/80 px-4 py-5 text-sm text-muted-foreground">
          当前切片还没有 outcome 轨道项。
        </div>
      )}
    </section>
  );
}

export function ResearchChart({
  candles,
  outcomes,
  records,
  activeRecord = null,
  selectedOutcomeId,
  onSelectOutcome,
  symbol,
  timeframe,
  className,
}: ResearchChartProps) {
  const chartHostRef = useRef<HTMLDivElement | null>(null);
  const chartHandleRef = useRef<ResearchChartHandle | null>(null);
  const [activeMorphologyId, setActiveMorphologyId] = useState<string | null>(null);
  const seriesData = useMemo(() => toCandlestickSeriesData(candles), [candles]);
  const activeMorphology = activeRecord?.morphology ?? null;
  const timeBounds = useMemo(
    () => buildResearchChartTimeBounds(candles, outcomes, activeMorphology),
    [candles, outcomes, activeMorphology],
  );
  const visibleRange = useMemo(() => toTimeScaleRange(timeBounds), [timeBounds]);
  const hasTimelineData = candles.length > 0 || outcomes.length > 0;
  const laneRows = useMemo(
    () => buildOutcomeLaneRows(outcomes, timeBounds),
    [outcomes, timeBounds],
  );
  const selectedLaneItem = useMemo(
    () => findOutcomeLaneItem(laneRows, selectedOutcomeId),
    [laneRows, selectedOutcomeId],
  );
  const chartLayoutStyle = useMemo(
    () =>
      ({
        ["--research-chart-price-scale-width" as string]: `${CHART_PRICE_SCALE_WIDTH_PX}px`,
      }) as CSSProperties,
    [],
  );
  const handleHighlightMorphology = useCallback((id: string | null) => {
    setActiveMorphologyId(id);
  }, []);

  useEffect(() => {
    setActiveMorphologyId(null);
  }, [activeRecord?.id]);

  useEffect(() => {
    const host = chartHostRef.current;

    if (!host) {
      return;
    }

    chartHandleRef.current = createResearchChartHandle(host);

    return () => {
      chartHandleRef.current?.chart.remove();
      chartHandleRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartHandleRef.current?.candleSeries.setData(seriesData);
  }, [seriesData]);

  useEffect(() => {
    if (!hasTimelineData) {
      return;
    }

    chartHandleRef.current?.chart.timeScale().setVisibleRange(visibleRange);
  }, [hasTimelineData, visibleRange]);

  useEffect(() => {
    const host = chartHostRef.current;
    const chartHandle = chartHandleRef.current;

    if (!host || !chartHandle) {
      return;
    }

    if (typeof ResizeObserver === "undefined") {
      const handleWindowResize = () => {
        resizeResearchChart(chartHandle, host.clientWidth);
      };

      window.addEventListener("resize", handleWindowResize);

      return () => {
        window.removeEventListener("resize", handleWindowResize);
      };
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const nextWidth =
        entries[0]?.contentRect.width ?? host.clientWidth ?? CHART_FALLBACK_WIDTH_PX;

      resizeResearchChart(chartHandle, nextWidth);
    });

    resizeObserver.observe(host);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <section
      className={cn(
        "rounded-lg border border-border/80 bg-card/95 p-5 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.18)]",
        className,
      )}
      aria-label="本地研究图"
    >
      <ResearchChartHeader symbol={symbol} timeframe={timeframe} />

      <div className="mt-4 grid gap-4" style={chartLayoutStyle}>
        <ResearchChartMorphologyLegend
          record={activeRecord}
          activeMorphologyId={activeMorphologyId}
          onHighlightMorphology={handleHighlightMorphology}
        />

        <div className="research-chart-shell">
          {selectedLaneItem ? (
            <div
              className="research-chart-plot-area"
              data-slot="research-chart-plot-area"
            >
              <div
                className="research-chart-window"
                data-slot="research-chart-window"
                style={{
                  left: `${selectedLaneItem.windowLeftPercent}%`,
                  width: `${selectedLaneItem.windowWidthPercent}%`,
                }}
              />
            </div>
          ) : null}

          <div
            ref={chartHostRef}
            data-slot="research-chart-canvas"
            className="h-[320px] w-full"
          />
        </div>

        <ResearchChartMorphologyTimeLanes
          record={activeRecord}
          timeBounds={timeBounds}
          activeMorphologyId={activeMorphologyId}
          onHighlightMorphology={handleHighlightMorphology}
        />

        <ResearchOutcomeLanes
          laneRows={laneRows}
          records={records}
          selectedOutcomeId={selectedOutcomeId}
          onSelectOutcome={onSelectOutcome}
        />
      </div>
    </section>
  );
}
