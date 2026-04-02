import { expect, test } from "playwright/test";

test("submit replay job from the replay lab", async ({ page }) => {
  const summary = `replay target ${crypto.randomUUID()}`;

  await page.goto("http://localhost:3000/login");

  await page.getByLabel("登录密码").fill("secret-pass");
  await page.getByRole("button", { name: "登录" }).click();

  await expect(page).toHaveURL("http://localhost:3000/config");
  await page.waitForTimeout(500);

  await page.getByLabel("摘要").fill(summary);
  await page.getByLabel("风险比例").fill("0.8");
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().endsWith("/api/configs"),
    ),
    page.getByRole("button", { name: "创建新版本" }).click(),
  ]);

  const history = page.getByRole("complementary");
  const createdVersion = history
    .getByRole("article")
    .filter({ hasText: summary })
    .last();

  await expect(createdVersion).toBeVisible();
  const configVersionId = (await createdVersion.locator("p").first().textContent())?.trim();

  if (!configVersionId) {
    throw new Error("Created config version card did not expose an id.");
  }

  await page.goto("http://localhost:3000/replay");

  await expect(page.getByRole("heading", { name: "回放实验室" })).toBeVisible();
  await page.waitForTimeout(500);
  await page.getByLabel("开始日期", { exact: true }).fill("2026-01-01");
  await page.getByLabel("结束日期", { exact: true }).fill("2026-02-01");
  await page.getByLabel("配置版本").selectOption(configVersionId);
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().endsWith("/api/replays"),
    ),
    page.getByRole("button", { name: "提交回放任务" }).click(),
  ]);

  await expect(page.getByText(/回放任务已提交/)).toBeVisible();

  const replayItem = page.getByRole("article").filter({ hasText: summary }).first();

  await expect(replayItem).toBeVisible();
  await expect(replayItem.getByText("快照数")).toBeVisible();
});
