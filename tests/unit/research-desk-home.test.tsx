import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

vi.mock("@/components/analysis/price-chart", () => ({
  PriceChart: ({
    symbol,
    title,
  }: {
    symbol: string;
    title?: string;
  }) => (
    <div>
      {title ?? "Mock PriceChart"} {symbol}
    </div>
  ),
}));

import HomePage from "@/app/page";

it("renders the trader strategy research desk shell", async () => {
  render(await HomePage());

  expect(
    screen.getByRole("heading", { name: "交易员策略研究台" }),
  ).toBeInTheDocument();
  expect(screen.getByText("工作台操作")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "候选策略" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "新建记录" })).toBeInTheDocument();
  expect(screen.getByText("BTC 主图 BTC")).toBeInTheDocument();
  expect(screen.getByText("ETH 辅图 ETH")).toBeInTheDocument();
});

it("opens the record composer dialog from the workspace action card", async () => {
  const user = userEvent.setup();

  render(await HomePage());

  await user.click(screen.getByRole("button", { name: "新建记录" }));

  expect(screen.getByRole("heading", { name: "新建交易记录" })).toBeInTheDocument();
  expect(screen.getByText("记录创建器")).toBeInTheDocument();
});

it("toggles the ETH chart from the dual-chart workspace", async () => {
  const user = userEvent.setup();

  render(await HomePage());

  await user.click(screen.getByRole("button", { name: "收起 ETH 图" }));

  expect(screen.queryByText("ETH 辅图 ETH")).not.toBeInTheDocument();
  expect(screen.getByText("ETH 辅图已收起")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "展开" }));

  expect(screen.getByText("ETH 辅图 ETH")).toBeInTheDocument();
});
