import { expect, test } from "playwright/test";

test("login, inspect dashboard, save config, submit replay, and view run history", async ({
  page,
}) => {
  const configSummary = `full-console guardrail ${Date.now()}`;

  await page.goto("/login");
  await page.getByLabel("登录密码").fill("secret-pass");
  await page.getByRole("button", { name: "登录" }).click();

  await expect(page).toHaveURL("http://localhost:3000/config");

  await page.goto("/command-center");
  await expect(
    page.getByRole("heading", { name: "命令中心", level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "运行分析" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "BTC", level: 3 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "ETH", level: 3 })).toBeVisible();

  await page.goto("/config");
  await page.getByLabel("摘要").fill(configSummary);
  await page.getByLabel("风险比例").fill("0.7");
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().endsWith("/api/configs"),
    ),
    page.getByRole("button", { name: "创建新版本" }).click(),
  ]);

  await expect(
    page.getByRole("complementary")
      .getByRole("heading", { name: configSummary, level: 3 })
      .first(),
  ).toBeVisible();

  await page.goto("/replay");
  await expect(page.getByRole("heading", { name: "回放实验室", level: 1 })).toBeVisible();
  await page.getByLabel("开始日期", { exact: true }).fill("2026-01-01");
  await page.getByLabel("结束日期", { exact: true }).fill("2026-02-01");
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().endsWith("/api/replays"),
    ),
    page.getByRole("button", { name: "提交回放任务" }).click(),
  ]);

  await expect(page.getByText(/回放任务已提交/)).toBeVisible();

  await page.goto("/runs");
  await expect(page.getByRole("heading", { name: "运行历史", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "baseline-v1" }).first()).toBeVisible();

  const healthResponse = await page.request.get("/api/health");
  expect(healthResponse.ok()).toBeTruthy();
  expect(await healthResponse.json()).toMatchObject({ status: "ok" });
});
