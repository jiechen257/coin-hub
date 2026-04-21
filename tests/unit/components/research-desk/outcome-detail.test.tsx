import { render, screen } from "@testing-library/react";
import { OutcomeDetail } from "@/components/research-desk/outcome-detail";
import type {
  ResearchDeskOutcome,
  ResearchDeskReviewTagOption,
} from "@/components/research-desk/research-desk-types";

const outcome: ResearchDeskOutcome = {
  id: "outcome-1",
  subjectType: "record",
  subjectId: "record-1",
  recordId: "record-1",
  planId: null,
  symbol: "BTC",
  timeframe: "1h",
  windowType: "plan-follow-through",
  windowStartAt: "2026-04-18T12:00:00.000Z",
  windowEndAt: "2026-04-19T12:00:00.000Z",
  resultLabel: "good",
  resultReason: "观察窗口内先命中顺向阈值，时间已对齐到最近K线",
  forwardReturnPercent: 1.23,
  maxFavorableExcursionPercent: 3.04,
  maxAdverseExcursionPercent: -0.68,
  ruleVersion: "v1",
  computedAt: "2026-04-20T00:00:00.000Z",
  reviewTags: ["趋势跟随"],
};

const reviewTagOptions: ResearchDeskReviewTagOption[] = [
  { label: "趋势跟随", kind: "preset" },
  { label: "突破追随", kind: "preset" },
];

it("keeps outcome detail focused on reasoning, excursion, and review tags", () => {
  render(
    <OutcomeDetail
      outcome={outcome}
      reviewTagOptions={reviewTagOptions}
      onSaveReviewTags={async () => {}}
    />,
  );

  expect(screen.getByText("结果详情")).toBeInTheDocument();
  expect(screen.getByText("观察窗口内先命中顺向阈值，时间已对齐到最近K线")).toBeInTheDocument();
  expect(screen.getByText("最大顺向波动")).toBeInTheDocument();
  expect(screen.getByText("最大逆向波动")).toBeInTheDocument();
  expect(screen.getByText("Review Tags")).toBeInTheDocument();

  expect(screen.queryByText("观察开始")).not.toBeInTheDocument();
  expect(screen.queryByText("观察结束")).not.toBeInTheDocument();
  expect(screen.queryByText("窗口收益")).not.toBeInTheDocument();
});
