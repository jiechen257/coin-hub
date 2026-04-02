import { expect, test } from "playwright/test";

test("analysis workspace switches BTC/ETH and timeframe tabs", async ({ page }) => {
  await page.goto("http://localhost:3000/login");

  await page.getByLabel("登录密码").fill("secret-pass");
  await page.getByRole("button", { name: "登录" }).click();

  await page.goto("http://localhost:3000/analysis");

  await expect(page.getByRole("heading", { name: "BTC / ETH 图表研究" })).toBeVisible();
  await expect(page.getByText("当前视图")).toBeVisible();
  await expect(page.getByText("BTC / 1h")).toBeVisible();
  await expect(page.getByRole("heading", { name: "BTC 信号" })).toBeVisible();

  await page.getByRole("button", { name: "ETH" }).click();
  await expect(page.getByText("ETH / 1h")).toBeVisible();
  await expect(page.getByRole("heading", { name: "ETH 信号" })).toBeVisible();

  await page.getByRole("tab", { name: "4h" }).click();
  await expect(page.getByText("ETH / 4h")).toBeVisible();
  await expect(page.getByRole("heading", { name: "ETH 信号" })).toBeVisible();
});
