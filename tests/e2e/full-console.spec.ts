import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { expect, test } from "playwright/test";

// 生成唯一文本，避免测试断言与共享数据库中的旧记录撞名。
function buildUniqueLabel(prefix: string) {
  return `${prefix} ${crypto.randomUUID()}`;
}

// 预先种一条唯一 run 快照，保证运行历史页的断言不依赖并发测试或共享数据。
async function seedUniqueRunHistory(strategyVersion: string) {
  return db.runSnapshot.create({
    data: {
      mode: "manual",
      strategyVersion,
      warningsJson: ["full-console history guardrail"],
      assetsJson: {
        BTC: {
          symbol: "BTC",
          confidence: 0.88,
          status: "ready",
          evidence: ["BTC history evidence"],
        },
        ETH: {
          symbol: "ETH",
          confidence: 0.84,
          status: "ready",
          evidence: ["ETH history evidence"],
        },
      },
      inputRefsJson: Prisma.JsonNull,
      degradedAssetsJson: [],
      createdAt: new Date(),
    },
  });
}

test("inspect dashboard, save config, submit replay, and view run history", async ({
  page,
}) => {
  const configSummary = buildUniqueLabel("full-console config");
  const runHistoryVersion = buildUniqueLabel("full-console run");
  const seededRun = await seedUniqueRunHistory(runHistoryVersion);

  try {
    await page.goto("/");
    await expect(page).toHaveURL("http://localhost:3000/");
    await expect(page.getByRole("heading", { name: "策略总览" })).toBeVisible();
    await expect(page.getByText("首页总览", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "运行分析" })).toBeVisible();

    await Promise.all([
      page.waitForURL("http://localhost:3000/config"),
      page.getByRole("link", { name: "配置", exact: true }).click(),
    ]);
    await expect(page.getByRole("heading", { name: "配置版本管理" })).toBeVisible();
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

    const history = page.getByRole("complementary");
    const createdVersion = history
      .getByRole("article")
      .filter({ hasText: configSummary })
      .last();

    await expect(createdVersion).toBeVisible();
    const configVersionId = (await createdVersion
      .locator("p")
      .first()
      .textContent())?.trim();

    if (!configVersionId) {
      throw new Error("未能从配置历史中读取新版本 ID。");
    }

    await Promise.all([
      page.waitForURL("http://localhost:3000/replay"),
      page.getByRole("link", { name: "回放", exact: true }).click(),
    ]);
    await expect(page.getByRole("heading", { name: "回放实验室" })).toBeVisible();
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

    await page.goto("http://localhost:3000/runs");
    await expect(page.getByRole("heading", { name: "运行历史" })).toBeVisible();
    await expect(page.getByRole("link", { name: runHistoryVersion }).first()).toBeVisible();

    const healthResponse = await page.request.get("/api/health");
    expect(healthResponse.ok()).toBeTruthy();
    expect(await healthResponse.json()).toMatchObject({ status: "ok" });
  } finally {
    // 无论用例成功还是失败，都精准清理本次种入的 run 快照，避免共享测试库被长期污染。
    await db.runSnapshot.deleteMany({
      where: { id: seededRun.id },
    });
  }
});
