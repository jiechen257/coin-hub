import { expect, test } from "playwright/test";

test("save a config version and surface it in the history", async ({ page }) => {
  const summary = `tighten risk guardrails ${crypto.randomUUID()}`;

  await page.goto("http://localhost:3000/login");

  await page.getByLabel("登录密码").fill("secret-pass");
  await page.getByRole("button", { name: "登录" }).click();

  await expect(page).toHaveURL("http://localhost:3000/config");
  await page.waitForTimeout(500);

  await page.getByLabel("摘要").fill(summary);
  await page.getByLabel("风险比例").fill("0.9");
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().endsWith("/api/configs"),
    ),
    page.getByRole("button", { name: "创建新版本" }).click(),
  ]);

  await page.waitForURL("http://localhost:3000/config");

  const history = page.getByRole("complementary");
  const createdVersion = history
    .getByRole("article")
    .filter({ hasText: summary })
    .last();

  await expect(createdVersion).toBeVisible();
  await expect(createdVersion.getByText("风险比例：0.9")).toBeVisible();
});
