import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, test } from "playwright/test";

const E2E_DATABASE_URL = "file:./prisma/e2e.db";
const RESEARCH_RECORD_LOCAL_TIME = "2026-04-19T08:00";
const RESEARCH_RECORD_RAW_CONTENT =
  "BTC 记录图复盘：回踩结构支撑后跟随上破，计划按 1h 窗口观察。";
const REVIEW_TAG_LABEL = "突破追随";
const TSX_CLI_PATH = resolve(process.cwd(), "node_modules/tsx/dist/cli.mjs");

async function seedResearchChartCandles(recordOccurredAtIso: string) {
  execFileSync(process.execPath, [TSX_CLI_PATH, "-e", `
    import { db } from "./src/lib/db";

    (async () => {
      const startAt = new Date(process.env.RECORD_OCCURRED_AT ?? "");
      const candles = Array.from({ length: 26 }, (_, index) => {
        const drift = index - 1;
        const open = 100 + drift * 1.1;
        const close = open + 0.8;

        return {
          symbol: "BTC",
          timeframe: "1h",
          openTime: new Date(startAt.getTime() + drift * 60 * 60 * 1000),
          open,
          high: close + 1.8,
          low: open - 0.4,
          close,
          volume: 120 + index,
          source: "playwright-e2e",
        };
      });
      const firstOpenTime = candles[0]?.openTime;
      const lastOpenTime = candles.at(-1)?.openTime;

      await db.candle.deleteMany({
        where: {
          symbol: "BTC",
          timeframe: "1h",
          ...(firstOpenTime && lastOpenTime
            ? {
                openTime: {
                  gte: firstOpenTime,
                  lte: lastOpenTime,
                },
              }
            : {}),
        },
      });
      await db.candle.createMany({ data: candles });
      await db.$disconnect();
    })().catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  `], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: E2E_DATABASE_URL,
      LOCAL_DATABASE_URL: E2E_DATABASE_URL,
      TURSO_DATABASE_URL: "",
      TURSO_AUTH_TOKEN: "",
      RECORD_OCCURRED_AT: recordOccurredAtIso,
    },
  });
}

test("records a new research item from the first screen and saves a review tag", async ({
  page,
}) => {
  await seedResearchChartCandles(new Date(RESEARCH_RECORD_LOCAL_TIME).toISOString());

  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "记录 K 线图工作台" }),
  ).toBeVisible();
  await expect(page.getByLabel("本地研究图")).toBeVisible();
  await expect(page.locator('[data-slot="research-chart-canvas"]')).toBeVisible();
  await expect(page.getByLabel("outcome 轨道")).toBeVisible();
  await expect(page.getByLabel("TradingView 参考视图")).toBeVisible();

  await page.getByRole("button", { name: "新建记录" }).click();
  await expect(page.getByRole("heading", { name: "新建交易记录" })).toBeVisible();

  await page.getByRole("button", { name: /快速新增交易员/ }).click();
  await page.getByLabel("交易员名称").fill("Record Flow Trader");
  await page.getByRole("button", { name: "新增交易员", exact: true }).click();
  await expect(page.getByText("已新增交易员 Record Flow Trader")).toBeVisible();

  await page.locator("#started-at").fill(RESEARCH_RECORD_LOCAL_TIME);
  await page.getByLabel("原始记录").fill(RESEARCH_RECORD_RAW_CONTENT);
  await page.getByLabel("入场价").fill("100");
  await page.getByLabel("出场价").fill("104");
  await page.getByRole("button", { name: "保存记录" }).click();

  await expect(
    page.getByRole("heading", { name: "新建交易记录" }),
  ).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "结果判断与回看标签" }).first(),
  ).toBeVisible();
  await expect(page.locator(".research-lane-row")).toHaveCount(1);
  await expect(
    page.getByText(RESEARCH_RECORD_RAW_CONTENT, { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: REVIEW_TAG_LABEL }).nth(1).click();
  await page.getByRole("button", { name: "保存标签" }).click();

  await expect(page.getByText("当前 Review Tags").last()).toBeVisible();

  const toolbar = page.getByLabel("研究图控制条");
  await toolbar.getByRole("button", { name: REVIEW_TAG_LABEL }).click();

  await expect(page.getByText(`当前标签过滤：${REVIEW_TAG_LABEL}`)).toBeVisible();
  await expect(page.getByText(new RegExp(`${REVIEW_TAG_LABEL}\\s+1`))).toBeVisible();
});
