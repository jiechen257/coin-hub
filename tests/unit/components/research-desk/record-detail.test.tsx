import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecordDetail } from "@/components/research-desk/record-detail";
import type { ResearchDeskRecord } from "@/components/research-desk/research-desk-types";

const record: ResearchDeskRecord = {
  id: "record-1",
  traderId: "trader-1",
  symbol: "BTC",
  timeframe: "1h",
  recordType: "view",
  sourceType: "manual",
  occurredAt: "2026-04-15T00:00:00.000Z",
  rawContent: "76000 后观察 15m 二三笔结构，低点关注 17-19 号。",
  notes: null,
  trader: {
    id: "trader-1",
    name: "推特-简简",
    platform: "twitter",
    notes: null,
  },
  executionPlans: [
    {
      id: "plan-1",
      label: "A-1h 上涨延续",
      status: "pending",
      side: "long",
      entryPrice: 73500,
      exitPrice: 76000,
      stopLoss: 72000,
      takeProfit: 79000,
      marketContext: "BTC 1h",
      triggerText: "15m 第三笔上涨启动并突破 76000",
      entryText: "先观察 15m 第二笔下跌结束，再看第三笔上涨确认。",
      riskText: "若跌破 72000，则 4h 延续结构转弱。",
      exitText: "上方关注 78000-79000。",
      notes: null,
      sample: null,
    },
  ],
};

it("keeps settlement fields collapsed until user chooses to expand them", async () => {
  const user = userEvent.setup();

  render(
    <RecordDetail
      record={record}
      onSettlePlan={async () => {}}
    />,
  );

  await user.click(screen.getByRole("button", { name: /A-1h 上涨延续/ }));

  expect(screen.getByRole("button", { name: "录入结算" })).toBeInTheDocument();
  expect(screen.queryByLabelText("开仓参考价")).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "录入结算" }));

  expect(screen.getByLabelText("开仓参考价")).toBeInTheDocument();
  expect(screen.getByLabelText("平仓参考价")).toBeInTheDocument();
});
