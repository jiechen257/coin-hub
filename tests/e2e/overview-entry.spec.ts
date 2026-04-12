import { expect, test } from "playwright/test";

test("home stays on root route and shows shared navigation", async ({
  page,
}) => {
  await page.goto("http://localhost:3000/");

  await expect(page).toHaveURL("http://localhost:3000/");
  await expect(page.getByRole("heading", { name: "Coin Hub" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "策略总览" })).toBeVisible();
  const primaryNav = page.getByRole("navigation", { name: "主导航" });
  await expect(primaryNav.getByRole("link", { name: "总览", exact: true })).toBeVisible();
  await expect(primaryNav.getByRole("link", { name: "研究", exact: true })).toBeVisible();
  await expect(primaryNav.getByRole("link", { name: "运行", exact: true })).toBeVisible();
  await expect(primaryNav.getByRole("link", { name: "回放", exact: true })).toBeVisible();
  await expect(primaryNav.getByRole("link", { name: "配置", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "退出登录" })).toHaveCount(0);

  await page.goto("http://localhost:3000/config");
  await expect(page.getByText("策略配置")).toBeVisible();
  await expect(page.getByRole("heading", { name: "配置版本管理" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Coin Hub" })).toBeVisible();
  await expect(primaryNav.getByRole("link", { name: "配置", exact: true })).toBeVisible();
});
