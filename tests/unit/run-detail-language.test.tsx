import { render, screen } from "@testing-library/react";
import { RunDetail } from "@/components/runs/run-detail";

it("renders run detail with Chinese labels", () => {
  render(
    <RunDetail
      run={{
        id: "run-1",
        mode: "manual",
        strategyVersion: "baseline-v1",
        warnings: ["样例告警"],
        assets: {
          BTC: {
            symbol: "BTC",
            confidence: 0.88,
            status: "ready",
            evidence: ["结构保持上行"],
          },
          ETH: {
            symbol: "ETH",
            confidence: 0.76,
            status: "ready",
            evidence: ["推文观点偏多"],
          },
        },
        degradedAssets: [],
        createdAt: new Date("2026-04-02T00:00:00.000Z"),
      }}
    />,
  );

  expect(screen.getByText("运行详情")).toBeInTheDocument();
  expect(screen.getByText("已选运行")).toBeInTheDocument();
  expect(screen.getByText("运行 ID")).toBeInTheDocument();
  expect(screen.getByText("置信度：88.0%")).toBeInTheDocument();
  expect(screen.getAllByText("证据")).toHaveLength(2);
});
