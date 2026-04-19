import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

vi.mock("@/components/research-desk/research-desk-data", () => ({
  loadResearchDeskPayload: vi.fn(async () => ({
    selection: { symbol: "BTC", timeframe: "1h" },
    selectedOutcomeId: "outcome-1",
    reviewTagOptions: [{ label: "趋势跟随", kind: "preset" }],
    summary: {
      counts: { good: 1, neutral: 0, bad: 1, pending: 0, total: 2 },
      reviewTags: [{ label: "趋势跟随", count: 1, kind: "preset" }],
    },
    chart: {
      candles: [
        {
          openTime: "2026-04-19T00:00:00.000Z",
          open: 100,
          high: 105,
          low: 98,
          close: 102,
          volume: 12,
        },
      ],
      outcomes: [
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
          windowEndAt: "2026-04-19T02:00:00.000Z",
          resultLabel: "good",
          resultReason: "顺向阈值先命中",
          forwardReturnPercent: 3.2,
          maxFavorableExcursionPercent: 4.8,
          maxAdverseExcursionPercent: -1.1,
          ruleVersion: "v1",
          computedAt: "2026-04-19T03:00:00.000Z",
          reviewTags: ["趋势跟随"],
        },
      ],
    },
    traders: [
      {
        id: "trader-1",
        name: "交易员 A",
        platform: "x",
        notes: null,
      },
    ],
    records: [
      {
        id: "record-1",
        traderId: "trader-1",
        symbol: "BTC",
        timeframe: "1h",
        recordType: "trade",
        sourceType: "manual",
        occurredAt: "2026-04-19T00:00:00.000Z",
        rawContent: "BTC 记录",
        notes: null,
        trader: {
          id: "trader-1",
          name: "交易员 A",
          platform: "x",
          notes: null,
        },
        executionPlans: [],
      },
    ],
    selectedRecordId: "record-1",
    candidates: [
      {
        id: "candidate-1",
        marketContext: "BTC 1h",
        triggerText: "放量突破",
        entryText: "回踩确认后跟随",
        riskText: null,
        exitText: null,
        sampleCount: 2,
        winRate: 0.5,
        sampleRefs: [],
      },
    ],
  })),
}));

vi.mock("@/components/research-desk/research-chart", () => ({
  ResearchChart: () => <div>ResearchChart Mock</div>,
}));

vi.mock("@/components/analysis/price-chart", () => ({
  PriceChart: ({ title }: { title?: string }) => <div>{title ?? "Mock PriceChart"}</div>,
}));

import HomePage from "@/app/page";

it("renders the rebuilt research desk first screen", async () => {
  render(await HomePage());

  expect(
    screen.getByRole("heading", { name: "记录 K 线图工作台" }),
  ).toBeInTheDocument();
  expect(screen.getByText("TradingView 参考视图")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "候选策略" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "新建记录" })).toBeInTheDocument();
  expect(screen.getByText("ResearchChart Mock")).toBeInTheDocument();
});

it("opens the record composer dialog from the workspace action card", async () => {
  const user = userEvent.setup();

  render(await HomePage());

  await user.click(screen.getByRole("button", { name: "新建记录" }));

  expect(screen.getByRole("heading", { name: "新建交易记录" })).toBeInTheDocument();
  expect(screen.getByText("记录创建器")).toBeInTheDocument();
});

it("renders the TradingView secondary panel on the first screen", async () => {
  render(await HomePage());

  expect(screen.getByText("TradingView 参考视图")).toBeInTheDocument();
});
