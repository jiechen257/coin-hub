import { expect, test } from "playwright/test";

test("command center redirects to the homepage overview entry", async ({
  page,
}) => {
  await page.goto("http://localhost:3000/command-center");

  await expect(page).toHaveURL("http://localhost:3000/");
  await expect(page.getByRole("heading", { name: "策略总览" })).toBeVisible();
  await expect(page.getByText("首页总览", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "总览" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "命令中心" })).toHaveCount(0);
});
