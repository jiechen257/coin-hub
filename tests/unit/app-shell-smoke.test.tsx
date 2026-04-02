import { render, screen } from "@testing-library/react";
import { AppShell } from "@/components/app-shell/app-shell";

it("renders the protected app shell with Chinese navigation copy", () => {
  render(
    <AppShell>
      <p>控制台占位内容</p>
    </AppShell>,
  );

  expect(screen.getByText("Coin Hub")).toBeInTheDocument();
  expect(screen.getByText("策略控制台")).toBeInTheDocument();
  expect(screen.getByText("控制台占位内容")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "退出登录" })).toBeInTheDocument();
});
