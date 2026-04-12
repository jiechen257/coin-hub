import { render, screen } from "@testing-library/react";
import { AppShell } from "@/components/app-shell/app-shell";
import { vi } from "vitest";

let mockedPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockedPathname,
}));

it("renders the app shell with shared Chinese navigation copy", () => {
  mockedPathname = "/";

  render(
    <AppShell>
      <p>控制台占位内容</p>
    </AppShell>,
  );

  expect(screen.getByText("Coin Hub")).toBeInTheDocument();
  expect(screen.getByText("策略控制台")).toBeInTheDocument();
  expect(screen.getByText("控制台占位内容")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "总览" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "研究" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "运行" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "回放" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "配置" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "退出登录" })).not.toBeInTheDocument();
});

it("marks config as the active nav item on config routes", () => {
  mockedPathname = "/config";

  render(
    <AppShell>
      <p>配置页内容</p>
    </AppShell>,
  );

  expect(screen.getByRole("link", { name: "配置" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByRole("link", { name: "总览" })).not.toHaveAttribute(
    "aria-current",
    "page",
  );
});

it("does not mark config active for shared-prefix routes", () => {
  mockedPathname = "/config-extra";

  render(
    <AppShell>
      <p>扩展页内容</p>
    </AppShell>,
  );

  expect(screen.getByRole("link", { name: "配置" })).not.toHaveAttribute(
    "aria-current",
    "page",
  );
});
