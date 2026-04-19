"use client";

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
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
            结果条按时间窗口定位，选中项会同步高亮观察区间。
          </p>
        </div>
      </div>

      {laneRows.length > 0 ? (
        laneRows.map((row) => (
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
                const matchedRecord = findRecordForOutcome(records, item.outcome);
                const trackTitle = matchedRecord
                  ? buildRecordTrackTitle(matchedRecord)
                  : item.label;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className="research-outcome-lane"
                    data-result={item.outcome.resultLabel}
                    data-state={isSelected ? "selected" : "idle"}
                    aria-pressed={isSelected}
                    style={{
                      left: `${item.leftPercent}%`,
                      width: `${item.widthPercent}%`,
                    }}
                    onClick={() => handleLaneClick(item.id)}
                  >
                    <span className="research-outcome-lane-content">
                      <span className="truncate text-sm font-medium leading-4 text-foreground">
                        {trackTitle}
                      </span>
                      <span className="truncate text-xs leading-4 text-muted-foreground">
                        {item.meta}
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
        ))
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
  selectedOutcomeId,
  onSelectOutcome,
  symbol,
  timeframe,
  className,
}: ResearchChartProps) {
  const chartHostRef = useRef<HTMLDivElement | null>(null);
  const chartHandleRef = useRef<ResearchChartHandle | null>(null);
  const seriesData = useMemo(() => toCandlestickSeriesData(candles), [candles]);
  const timeBounds = useMemo(
    () => buildResearchChartTimeBounds(candles, outcomes),
    [candles, outcomes],
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
