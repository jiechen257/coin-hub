import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrategyCandidateList } from "@/components/research-desk/strategy-candidate-list";

const candidates = [
  {
    id: "candidate-1",
    marketContext: "BTC 1h 延续",
    triggerText: "回踩 73500-73700 不破继续观察上行",
    entryText: "确认 15m 第三笔上涨启动后分批进场",
    riskText: "跌破 72000 失效",
    exitText: "上方关注 78000-79000",
    sampleCount: 2,
    winRate: 0.75,
    sampleRefs: [
      {
        sampleId: "sample-1",
        recordId: "record-1",
        traderName: "推特-简简",
        rawContent: "关注 4 月 17-19 号低点，不跌破 72000 则仍有延续机会。",
      },
    ],
  },
];

it("opens candidate samples in a secondary dialog", async () => {
  const user = userEvent.setup();

  render(
    <StrategyCandidateList
      candidates={candidates}
      onRegenerate={async () => {}}
    />,
  );

  await user.click(
    screen.getByRole("button", { name: /回踩 73500-73700 不破继续观察上行/ }),
  );
  await user.click(screen.getByRole("button", { name: "查看样本原文" }));

  expect(screen.getByRole("heading", { name: "策略样本" })).toBeInTheDocument();
  expect(
    screen.getByText("关注 4 月 17-19 号低点，不跌破 72000 则仍有延续机会。"),
  ).toBeInTheDocument();
});
