import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

it("renders the trader strategy research desk shell", async () => {
  render(await HomePage());

  expect(
    screen.getByRole("heading", { name: "交易员策略研究台" }),
  ).toBeInTheDocument();
  expect(screen.getByText("BTC · 1h")).toBeInTheDocument();
  expect(screen.getByText("记录流")).toBeInTheDocument();
  expect(screen.getByText("候选策略")).toBeInTheDocument();
});
