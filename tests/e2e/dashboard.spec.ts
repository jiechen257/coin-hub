import { expect, test } from "playwright/test";

test("command center shows asset cards and can submit a manual analysis job", async ({
  page,
}) => {
  await page.goto("http://localhost:3000/login");

  await page.getByLabel("登录密码").fill("secret-pass");
  await page.getByRole("button", { name: "登录" }).click();

  await expect(page).toHaveURL("http://localhost:3000/config");

  await page.goto("http://localhost:3000/command-center");

  await expect(
    page.getByRole("heading", { level: 1, name: "命令中心" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "BTC" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "ETH" })).toBeVisible();

  await page.getByRole("button", { name: "运行分析" }).click();

  await expect(page.getByText(/分析任务已入队/)).toBeVisible();
});
