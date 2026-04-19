// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResearchChart } from "@/components/research-desk/research-chart";
import type {
  ResearchDeskCandle,
  ResearchDeskOutcome,
  ResearchDeskRecord,
} from "@/components/research-desk/research-desk-types";

const chartMocks = vi.hoisted(() => {
  const setDataMock = vi.fn();
  const setVisibleRangeMock = vi.fn();
  const resizeMock = vi.fn();
  const removeChartMock = vi.fn();
  const addSeriesMock = vi.fn(() => ({
    setData: setDataMock,
  }));
  const timeScaleMock = vi.fn(() => ({
    setVisibleRange: setVisibleRangeMock,
  }));
  const resizeObserverInstances: Array<{
    callback: ResizeObserverCallback;
    elements: Set<Element>;
  }> = [];
  const createChartMock = vi.fn(() => ({
    addSeries: addSeriesMock,
    resize: resizeMock,
    timeScale: timeScaleMock,
    remove: removeChartMock,
  }));
  class ResizeObserverMock {
    callback: ResizeObserverCallback;
    elements = new Set<Element>();

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
      resizeObserverInstances.push({
        callback,
        elements: this.elements,
      });
    }

    observe(element: Element) {
      this.elements.add(element);
    }

    unobserve(element: Element) {
      this.elements.delete(element);
    }

    disconnect() {
      this.elements.clear();
    }
  }

  function emitResize(target: Element, width: number, height = 320) {
    for (const observer of resizeObserverInstances) {
      if (observer.elements.has(target)) {
        observer.callback(
          [
            {
              target,
              contentRect: {
                width,
                height,
              },
            } as ResizeObserverEntry,
          ],
          {} as ResizeObserver,
        );
      }
    }
  }

  return {
    setDataMock,
    setVisibleRangeMock,
    resizeMock,
    removeChartMock,
    addSeriesMock,
    timeScaleMock,
    createChartMock,
    ResizeObserverMock,
    resizeObserverInstances,
    emitResize,
  };
});

vi.mock("lightweight-charts", () => ({
  CandlestickSeries: { kind: "CandlestickSeries" },
  createChart: chartMocks.createChartMock,
}));

const candles: ResearchDeskCandle[] = [
  {
    openTime: "2026-04-19T00:00:00.000Z",
    open: 100,
    high: 108,
    low: 98,
    close: 104,
    volume: 12,
  },
  {
    openTime: "2026-04-19T01:00:00.000Z",
    open: 104,
    high: 110,
    low: 102,
    close: 109,
    volume: 18,
  },
];

const outcomes: ResearchDeskOutcome[] = [
  {
    id: "outcome-1",
    subjectType: "record",
    subjectId: "record-1",
    recordId: "record-1",
    planId: null,
    symbol: "BTC",
    timeframe: "1h",
    windowType: "trade-follow-through",
    windowStartAt: "2026-04-19T00:00:00.000Z",
    windowEndAt: "2026-04-19T01:00:00.000Z",
    resultLabel: "good",
    resultReason: "顺向阈值先命中",
    forwardReturnPercent: 3.2,
    maxFavorableExcursionPercent: 4.8,
    maxAdverseExcursionPercent: -1.1,
    ruleVersion: "v1",
    computedAt: "2026-04-19T02:00:00.000Z",
    reviewTags: ["趋势跟随"],
  },
  {
    id: "outcome-2",
    subjectType: "plan",
    subjectId: "plan-2",
    recordId: "record-2",
    planId: "plan-2",
    symbol: "BTC",
    timeframe: "1h",
    windowType: "plan-follow-through",
    windowStartAt: "2026-04-19T00:30:00.000Z",
    windowEndAt: "2026-04-19T01:00:00.000Z",
    resultLabel: "bad",
    resultReason: "逆向波动先命中",
    forwardReturnPercent: -2.1,
    maxFavorableExcursionPercent: 0.8,
    maxAdverseExcursionPercent: -3.4,
    ruleVersion: "v1",
    computedAt: "2026-04-19T02:00:00.000Z",
    reviewTags: ["止损纪律差"],
  },
];

const records: ResearchDeskRecord[] = [
  {
    id: "record-1",
    traderId: "trader-1",
    symbol: "BTC",
    timeframe: "1h",
    recordType: "trade",
    sourceType: "manual",
    occurredAt: "2026-04-19T00:00:00.000Z",
    rawContent: "记录复盘标题\n附加说明",
    notes: null,
    trader: {
      id: "trader-1",
      name: "交易员甲",
      platform: null,
      notes: null,
    },
    executionPlans: [],
  },
  {
    id: "record-2",
    traderId: "trader-2",
    symbol: "BTC",
    timeframe: "1h",
    recordType: "view",
    sourceType: "manual",
    occurredAt: "2026-04-19T00:30:00.000Z",
    rawContent: "方案复盘标题",
    notes: null,
    trader: {
      id: "trader-2",
      name: "交易员乙",
      platform: null,
      notes: null,
    },
    executionPlans: [
      {
        id: "plan-2",
        label: "plan-2",
        status: "ready",
        side: "short",
        entryPrice: null,
        exitPrice: null,
        stopLoss: null,
        takeProfit: null,
        marketContext: null,
        triggerText: "触发",
        entryText: "入场",
        riskText: null,
        exitText: null,
        notes: null,
        sample: null,
      },
    ],
  },
];

function toExpectedTimestamp(value: string) {
  return Math.floor(new Date(value).getTime() / 1000);
}

describe("ResearchChart", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", chartMocks.ResizeObserverMock);
    chartMocks.createChartMock.mockClear();
    chartMocks.addSeriesMock.mockClear();
    chartMocks.setDataMock.mockClear();
    chartMocks.setVisibleRangeMock.mockClear();
    chartMocks.resizeMock.mockClear();
    chartMocks.removeChartMock.mockClear();
    chartMocks.timeScaleMock.mockClear();
    chartMocks.resizeObserverInstances.length = 0;
  });

  it("renders local outcome lanes, creates the local candlestick chart, and notifies on selection", async () => {
    const user = userEvent.setup();
    const onSelectOutcome = vi.fn();

    render(
      <ResearchChart
        candles={candles}
        outcomes={outcomes}
        records={records}
        selectedOutcomeId="outcome-1"
        onSelectOutcome={onSelectOutcome}
      />,
    );

    expect(chartMocks.createChartMock).toHaveBeenCalledTimes(1);
    expect(chartMocks.createChartMock).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        height: 320,
        rightPriceScale: expect.objectContaining({
          minimumWidth: 88,
        }),
      }),
    );
    expect(chartMocks.addSeriesMock).toHaveBeenCalledTimes(1);
    expect(chartMocks.setDataMock).toHaveBeenCalledWith([
      expect.objectContaining({
        time: expect.any(Number),
        open: 100,
        high: 108,
        low: 98,
        close: 104,
      }),
      expect.objectContaining({
        time: expect.any(Number),
        open: 104,
        high: 110,
        low: 102,
        close: 109,
      }),
    ]);
    expect(chartMocks.setVisibleRangeMock).toHaveBeenCalledWith({
      from: toExpectedTimestamp("2026-04-19T00:00:00.000Z"),
      to: toExpectedTimestamp("2026-04-19T01:00:00.000Z"),
    });

    const selectedLane = screen.getByRole("button", {
      name: /交易员甲 · 记录复盘标题.*正向 · 趋势跟随/i,
    });
    expect(selectedLane).toHaveAttribute("data-state", "selected");
    expect(
      document.querySelector('[data-slot="research-chart-lane-track"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-slot="research-chart-plot-area"]'),
    ).toBeTruthy();

    await user.click(
      screen.getByRole("button", {
        name: /交易员乙 · 方案复盘标题.*逆向 · 止损纪律差/i,
      }),
    );

    expect(onSelectOutcome).toHaveBeenCalledWith("outcome-2");
  });

  it("shows a visible selected state on the active outcome lane item", () => {
    render(
      <ResearchChart
        candles={candles}
        outcomes={outcomes}
        records={records}
        selectedOutcomeId="outcome-2"
        onSelectOutcome={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: /交易员乙 · 方案复盘标题.*逆向 · 止损纪律差/i,
      }),
    ).toHaveAttribute("data-state", "selected");
    expect(
      screen.getByRole("button", {
        name: /交易员甲 · 记录复盘标题.*正向 · 趋势跟随/i,
      }),
    ).toHaveAttribute("data-state", "idle");
  });

  it("shows a time popover when clicking a lane item and hides it on second click", async () => {
    const user = userEvent.setup();

    render(
      <ResearchChart
        candles={candles}
        outcomes={outcomes}
        records={records}
        selectedOutcomeId="outcome-1"
        onSelectOutcome={vi.fn()}
      />,
    );

    expect(
      document.querySelector('[data-slot="research-chart-time-popover"]'),
    ).toBeNull();

    await user.click(
      screen.getByRole("button", {
        name: /交易员甲 · 记录复盘标题.*正向 · 趋势跟随/i,
      }),
    );

    expect(
      document.querySelector('[data-slot="research-chart-time-popover"]'),
    ).toBeTruthy();
    expect(screen.getByText("观察开始")).toBeInTheDocument();
    expect(screen.getByText("观察结束")).toBeInTheDocument();
    expect(screen.getByText("持续时长")).toBeInTheDocument();
    expect(screen.getByText("1小时")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /交易员甲 · 记录复盘标题.*正向 · 趋势跟随/i,
      }),
    );

    expect(
      document.querySelector('[data-slot="research-chart-time-popover"]'),
    ).toBeNull();
  });

  it("resizes the chart when the observed host width changes after mount", () => {
    const { container } = render(
      <ResearchChart
        candles={candles}
        outcomes={outcomes}
        records={records}
        selectedOutcomeId="outcome-1"
        onSelectOutcome={vi.fn()}
      />,
    );

    const host = container.querySelector(
      '[data-slot="research-chart-canvas"]',
    ) as HTMLDivElement | null;

    expect(host).toBeTruthy();
    expect(chartMocks.createChartMock).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        width: 960,
      }),
    );

    chartMocks.emitResize(host as HTMLDivElement, 640);

    expect(chartMocks.resizeMock).toHaveBeenCalledWith(640, 320);
  });

  it("keeps the chart visible range aligned to outcome windows outside candle bounds", () => {
    const extendedOutcomes: ResearchDeskOutcome[] = [
      {
        ...outcomes[0],
        windowStartAt: "2026-04-18T23:00:00.000Z",
        windowEndAt: "2026-04-19T03:00:00.000Z",
      },
    ];

    render(
      <ResearchChart
        candles={candles}
        outcomes={extendedOutcomes}
        records={records}
        selectedOutcomeId="outcome-1"
        onSelectOutcome={vi.fn()}
      />,
    );

    expect(chartMocks.setVisibleRangeMock).toHaveBeenCalledWith({
      from: toExpectedTimestamp("2026-04-18T23:00:00.000Z"),
      to: toExpectedTimestamp("2026-04-19T03:00:00.000Z"),
    });
  });

  it("stays stable when candles are empty but outcomes exist", () => {
    render(
      <ResearchChart
        candles={[]}
        outcomes={[outcomes[0]]}
        records={records}
        selectedOutcomeId="outcome-1"
        onSelectOutcome={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: /交易员甲 · 记录复盘标题.*正向 · 趋势跟随/i,
      }),
    ).toBeInTheDocument();
    expect(chartMocks.setDataMock).toHaveBeenCalledWith([]);
    expect(chartMocks.setVisibleRangeMock).toHaveBeenCalledWith({
      from: toExpectedTimestamp("2026-04-19T00:00:00.000Z"),
      to: toExpectedTimestamp("2026-04-19T01:00:00.000Z"),
    });
  });

  it("skips visible range sync when both candles and outcomes are empty", () => {
    render(
      <ResearchChart
        candles={[]}
        outcomes={[]}
        records={records}
        selectedOutcomeId={null}
        onSelectOutcome={vi.fn()}
      />,
    );

    expect(chartMocks.setDataMock).toHaveBeenCalledWith([]);
    expect(chartMocks.setVisibleRangeMock).not.toHaveBeenCalled();
    expect(screen.getByText("当前切片还没有 outcome 轨道项。")).toBeInTheDocument();
  });

  it("does not render the selected window highlight when the selected outcome does not exist", () => {
    const { container } = render(
      <ResearchChart
        candles={candles}
        outcomes={outcomes}
        records={records}
        selectedOutcomeId="missing-outcome"
        onSelectOutcome={vi.fn()}
      />,
    );

    expect(
      container.querySelector('[data-slot="research-chart-window"]'),
    ).toBeNull();
  });
});
