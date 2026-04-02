import { expect, test } from "playwright/test";

test("forged cookie cannot bypass auth and login enters protected config page", async ({
  page,
}) => {
  await page.context().addCookies([
    {
      name: "coin-hub-session",
      value: "authenticated",
      domain: "localhost",
      path: "/",
    },
  ]);

  await page.goto("http://localhost:3000/config");

  await expect(page).toHaveURL("http://localhost:3000/login");
  await expect(page.getByRole("heading", { name: "登录 Coin Hub" })).toBeVisible();

  await page.goto("http://localhost:3000/login");

  await page.getByLabel("登录密码").fill("secret-pass");
  await page.getByRole("button", { name: "登录" }).click();

  await expect(page).toHaveURL("http://localhost:3000/config");
  await expect(page.getByText("策略配置")).toBeVisible();
  await expect(page.getByRole("heading", { name: "配置版本管理" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Coin Hub" })).toBeVisible();

  await page.getByRole("button", { name: "退出登录" }).click();

  await expect(page).toHaveURL("http://localhost:3000/login");
  await expect(page.getByRole("heading", { name: "登录 Coin Hub" })).toBeVisible();
});
