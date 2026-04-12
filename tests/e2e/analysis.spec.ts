import { db } from "@/lib/db";
import { expect, test, type Page } from "playwright/test";

type SeededCandle = {
  symbol: "BTC" | "ETH";
  timeframe: "1h" | "4h";
  openTime: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source: string;
};

// 生成略微领先当前时间的测试 K 线，确保分析页优先读到本次种子而不是共享库里的旧数据。
function buildSeededCandles(now: number): SeededCandle[] {
  return [
    {
      symbol: "BTC",
      timeframe: "1h",
      openTime: new Date(now + 60 * 60_000),
      open: 100,
      high: 104,
      low: 99,
      close: 102,
      volume: 10,
      source: "binance-futures",
    },
    {
      symbol: "BTC",
      timeframe: "1h",
      openTime: new Date(now + 2 * 60 * 60_000),
      open: 102,
      high: 106,
      low: 101,
      close: 105,
      volume: 11,
      source: "binance-futures",
    },
    {
      symbol: "BTC",
      timeframe: "1h",
      openTime: new Date(now + 3 * 60 * 60_000),
      open: 105,
      high: 108,
      low: 104,
      close: 107,
      volume: 12,
      source: "binance-futures",
    },
    {
      symbol: "ETH",
      timeframe: "1h",
      openTime: new Date(now + 60 * 60_000),
      open: 200,
      high: 206,
      low: 198,
      close: 204,
      volume: 13,
      source: "binance-futures",
    },
    {
      symbol: "ETH",
      timeframe: "1h",
      openTime: new Date(now + 2 * 60 * 60_000),
      open: 204,
      high: 209,
      low: 202,
      close: 207,
      volume: 14,
      source: "binance-futures",
    },
    {
      symbol: "ETH",
      timeframe: "4h",
      openTime: new Date(now + 4 * 60 * 60_000),
      open: 300,
      high: 308,
      low: 297,
      close: 305,
      volume: 21,
      source: "binance-futures",
    },
    {
      symbol: "ETH",
      timeframe: "4h",
      openTime: new Date(now + 8 * 60 * 60_000),
      open: 305,
      high: 312,
      low: 303,
      close: 310,
      volume: 22,
      source: "binance-futures",
    },
  ];
}

// 轮询分析接口直到它读到本次种子，避免页面首屏命中共享数据库里的旧状态。
async function waitForAnalysisSeed(
  page: Page,
  symbol: "BTC" | "ETH",
  timeframe: "1h" | "4h",
  expectedCount: number
) {
  await expect
    .poll(async () => {
      const response = await page.request.get(`/api/analysis/${symbol}?timeframe=${timeframe}`);
      const payload = (await response.json()) as {
        chart: {
          candles: Array<{ close: number }>;
        };
      };

      return payload.chart.candles.length;
    })
    .toBe(expectedCount);
}

test("analysis workspace switches BTC/ETH and timeframe tabs with real candles", async ({
  page,
}) => {
  const seededCandles = buildSeededCandles(Date.now());

  await db.candle.createMany({
    data: seededCandles,
  });

  try {
    await waitForAnalysisSeed(page, "BTC", "1h", 3);

    await page.goto("http://localhost:3000/analysis");

    await expect(page.getByRole("heading", { name: "BTC / ETH 图表研究" })).toBeVisible();
    await expect(page.getByText("当前视图")).toBeVisible();
    await expect(page.getByText("BTC / 1h")).toBeVisible();
    await expect(page.getByRole("heading", { name: "BTC 信号" })).toBeVisible();
    await expect(page.getByText("K 线数：3")).toBeVisible();
    await expect(page.getByText("最新收盘价：107.00", { exact: true })).toBeVisible();
    await expect(page.getByText("暂无 K 线数据")).not.toBeVisible();

    await Promise.all([
      page.waitForResponse((response) =>
        response.url().endsWith("/api/analysis/ETH?timeframe=1h"),
      ),
      page.getByRole("button", { name: "ETH" }).click(),
    ]);
    await expect(page.getByText("ETH / 1h")).toBeVisible();
    await expect(page.getByRole("heading", { name: "ETH 信号" })).toBeVisible();
    await expect(page.getByText("K 线数：2")).toBeVisible();
    await expect(page.getByText("最新收盘价：207.00", { exact: true })).toBeVisible();

    await Promise.all([
      page.waitForResponse((response) =>
        response.url().endsWith("/api/analysis/ETH?timeframe=4h"),
      ),
      page.getByRole("tab", { name: "4h" }).click(),
    ]);
    await expect(page.getByText("ETH / 4h")).toBeVisible();
    await expect(page.getByRole("heading", { name: "ETH 信号" })).toBeVisible();
    await expect(page.getByText("K 线数：2")).toBeVisible();
    await expect(page.getByText("最新收盘价：310.00", { exact: true })).toBeVisible();
  } finally {
    // 只清理本次 E2E 写入的 openTime 组合，避免误删共享数据库中的其他记录。
    await db.candle.deleteMany({
      where: {
        OR: seededCandles.map((candle) => ({
          symbol: candle.symbol,
          timeframe: candle.timeframe,
          openTime: candle.openTime,
        })),
      },
    });
  }
});
