import { expect, test } from "playwright/test";

test("creates a trader record, settles a plan, and regenerates candidates", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByLabel("交易员名称").fill("Trader A");
  await page.getByRole("button", { name: "新增交易员" }).click();
  await expect(page.getByText("已新增交易员 Trader A")).toBeVisible();

  await page.getByRole("radio", { name: "真实开单" }).check();
  await page.getByLabel("原始记录").fill("BTC 68000 开多，69000 平多");
  await page.getByLabel("入场价").fill("68000");
  await page.getByLabel("出场价").fill("69000");
  await page.getByRole("button", { name: "保存记录" }).click();

  await expect(page.getByText("BTC · trade")).toBeVisible();

  await page.getByLabel("结算时间").fill("2026-04-16T10:00");
  await page.getByRole("button", { name: "结算样本" }).click();
  await expect(page.getByText("收益 1000 / 1.47%")).toBeVisible();

  await page.getByRole("button", { name: "归纳候选策略" }).click();
  await expect(page.getByText("样本数 1")).toBeVisible();
});
