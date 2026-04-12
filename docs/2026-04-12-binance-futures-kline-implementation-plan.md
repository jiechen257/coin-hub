# Binance Futures 合约 K 线接入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace demo candles in the analysis workspace with real Binance USDⓈ-M Futures candles stored in `Candle`, and keep those candles fresh through an independent sync loop.

**Architecture:** Add a dedicated Binance Futures REST client for USDⓈ-M klines, route normalized closed candles through the existing candle repository, and introduce a worker-side sync loop that refreshes `BTC`/`ETH` across the supported timeframes without using the existing `Job` queue. Update the analysis data loader to read candles from SQLite first, surface empty/stale warnings, and keep the rest of the signal/marker pipeline unchanged.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Prisma + SQLite, Vitest, Playwright, Binance USDⓈ-M Futures REST

---

## File Map

### Create

- `src/modules/market-data/binance-futures-client.ts` — Binance USDⓈ-M Futures K 线 client，负责请求、过滤未闭合 bar、映射 OHLCV
- `src/modules/market-data/read-analysis-candles.ts` — 查询分析页所需 `Candle` 数据，并返回最新时间与 stale 状态
- `src/worker/market-data-sync.ts` — 独立行情同步循环，定时调用 `fetchAndStoreCandles()`
- `tests/unit/modules/market-data/binance-futures-client.test.ts` — Futures client 单元测试
- `tests/unit/worker/market-data-sync.test.ts` — 行情同步循环单元测试
- `tests/integration/components/analysis/analysis-data.test.ts` — `loadAnalysisPayload()` 真实读库/空状态/陈旧数据测试

### Modify

- `src/modules/market-data/fetch-and-store-candles.ts` — 切换到 Futures client，并写入新的 `source`
- `src/components/analysis/analysis-data.ts` — 用真实 `Candle` 代替 demo candles，并生成空状态/stale warnings
- `src/worker/index.ts` — 在 worker 常驻模式下同时启动 job scheduler 与 market-data sync loop
- `.env.example` — 补充 Binance Futures 和同步间隔相关配置
- `tests/integration/modules/market-data/fetch-and-store-candles.test.ts` — 更新为 Futures source 与闭合 K 线口径
- `tests/integration/api/analysis-route.test.ts` — 改成基于真实 `Candle` 种子验证 analysis API
- `tests/e2e/analysis.spec.ts` — 改成基于真实数据库 K 线验证分析页切换

### Optional Modify (only if needed during implementation)

- `src/app/api/analysis/[symbol]/route.ts` — 仅在需要补 route 级错误处理或 no-store 行为时调整
- `src/modules/market-data/candle-repository.ts` — 仅在需要补 source 语义常量或批量写入优化时调整
- `src/worker/scheduler.ts` — 仅在需要与行情同步 loop 协调 stop 生命周期时调整

## Shared Rules

- 所有新增函数和关键逻辑都必须补中文注释
- 第一阶段只支持 `BTC`、`ETH` 与 `15m`、`1h`、`4h`、`1d`
- 第一阶段只接 Binance USDⓈ-M Futures REST，不接 CoinGlass、不接 WebSocket
- analysis 数据链接入真实 K 线后，不允许静默 fallback 回 demo candles
- 行情同步不得进入现有 `Job` 队列，避免污染首页总览中的操作统计
- 进入分析链和数据库的 K 线必须是已闭合 bar

## Task 1: Introduce Binance Futures Kline Ingestion

**Files:**
- Create: `src/modules/market-data/binance-futures-client.ts`
- Modify: `src/modules/market-data/fetch-and-store-candles.ts`
- Modify: `tests/integration/modules/market-data/fetch-and-store-candles.test.ts`
- Test: `tests/unit/modules/market-data/binance-futures-client.test.ts`

- [ ] **Step 1: Write the failing unit test for the Futures client**

```ts
it("maps Binance USDⓈ-M futures klines and drops the last open bar", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify([
      [1710000000000, "100", "110", "95", "108", "12", 1710000899999],
      [1710000900000, "108", "112", "104", "111", "10", Date.now() + 60_000],
    ]))
  );

  const client = createBinanceFuturesClient(fetchMock as typeof fetch);
  const candles = await client.fetchCandles("BTC", "15m");

  expect(fetchMock).toHaveBeenCalled();
  expect(candles).toHaveLength(1);
  expect(candles[0].close).toBe(108);
});

it("throws when Binance returns a non-2xx response", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response("boom", { status: 502 }));
  const client = createBinanceFuturesClient(fetchMock as typeof fetch);

  await expect(client.fetchCandles("BTC", "15m")).rejects.toThrow(
    "failed to fetch Binance futures candles for BTC 15m",
  );
});
```

- [ ] **Step 2: Run the focused unit test and verify it fails**

Run: `pnpm vitest run tests/unit/modules/market-data/binance-futures-client.test.ts`  
Expected: FAIL because `binance-futures-client.ts` does not exist yet

- [ ] **Step 3: Implement the Futures client and switch ingestion to it**

Implementation requirements:

- `binance-futures-client.ts` 使用 Binance USDⓈ-M Futures Kline REST
- 支持把 `BTC` / `ETH` 规范成 `BTCUSDT` / `ETHUSDT`
- 请求结果需要映射成现有 `RawCandle[]`
- 客户端层直接过滤未闭合最后一根 K 线
- `fetchAndStoreCandles()` 切换到新 client，并将 `source` 改成明确的 futures 语义，例如 `binance-futures-usdm`
- 关键逻辑补中文注释

- [ ] **Step 4: Update the ingestion integration test**

Add/update assertions for:

```ts
expect(firstIngestion.processedCandles).toBe(8);
expect(await db.candle.count()).toBe(8);
expect(btc15m[0].source).toBe("binance-futures-usdm");
```

Use mocked payloads where the last candle is intentionally still open, so the test proves it is excluded.

- [ ] **Step 5: Run the focused test set**

Run: `pnpm vitest run tests/unit/modules/market-data/binance-futures-client.test.ts tests/integration/modules/market-data/fetch-and-store-candles.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/modules/market-data/binance-futures-client.ts src/modules/market-data/fetch-and-store-candles.ts tests/unit/modules/market-data/binance-futures-client.test.ts tests/integration/modules/market-data/fetch-and-store-candles.test.ts
git commit -m "feat: ingest binance futures candles"
```

## Task 2: Add the Independent Market-Data Sync Loop

**Files:**
- Create: `src/worker/market-data-sync.ts`
- Modify: `src/worker/index.ts`
- Modify: `.env.example`
- Test: `tests/unit/worker/market-data-sync.test.ts`

- [ ] **Step 1: Write the failing sync-loop test**

```ts
it("runs one immediate sync and schedules the next tick", async () => {
  const sync = vi.fn().mockResolvedValue({ processedCandles: 8 });
  const handle = startMarketDataSyncLoop({ sync, intervalMs: 60_000 });

  expect(sync).toHaveBeenCalledTimes(1);
  handle.stop();
});

it("logs sync failures and still schedules the next tick", async () => {
  vi.useFakeTimers();
  const sync = vi.fn()
    .mockRejectedValueOnce(new Error("network down"))
    .mockResolvedValueOnce({ processedCandles: 8 });
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  const handle = startMarketDataSyncLoop({ sync, intervalMs: 1_000 });
  await vi.runOnlyPendingTimersAsync();

  expect(errorSpy).toHaveBeenCalled();
  expect(sync).toHaveBeenCalledTimes(2);
  handle.stop();
});
```

Also add a worker-index assertion that long-running worker mode starts both loops, while `--once` keeps the existing job-only behavior.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `pnpm vitest run tests/unit/worker/market-data-sync.test.ts tests/integration/worker/worker-index.test.ts`  
Expected: FAIL because the sync loop does not exist yet

- [ ] **Step 3: Implement the market-data sync loop**

Implementation requirements:

- `startMarketDataSyncLoop()` uses `fetchAndStoreCandles()` internally by default
- default interval reads `MARKET_DATA_SYNC_INTERVAL_MS` and falls back to `60000`
- sync failure only logs and continues the loop
- `stop()` must clear the timer
- `src/worker/index.ts` long-running mode starts `startJobScheduler()` and `startMarketDataSyncLoop()` together
- `--once` behavior remains unchanged
- `.env.example` adds:
  - `BINANCE_FUTURES_BASE_URL=https://fapi.binance.com`
  - `MARKET_DATA_SYNC_INTERVAL_MS=60000`

- [ ] **Step 4: Run the focused tests and make them pass**

Run: `pnpm vitest run tests/unit/worker/market-data-sync.test.ts tests/integration/worker/worker-index.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/worker/market-data-sync.ts src/worker/index.ts tests/unit/worker/market-data-sync.test.ts tests/integration/worker/worker-index.test.ts .env.example
git commit -m "feat: add market data sync loop"
```

## Task 3: Replace Demo Candles with Database-Backed Analysis Data

**Files:**
- Create: `src/modules/market-data/read-analysis-candles.ts`
- Modify: `src/components/analysis/analysis-data.ts`
- Modify: `tests/integration/api/analysis-route.test.ts`
- Test: `tests/integration/components/analysis/analysis-data.test.ts`

- [ ] **Step 1: Write the failing integration test for real analysis candles**

Add a test that seeds `Candle` rows and asserts:

```ts
const payload = await loadAnalysisPayload({ symbol: "BTC", timeframe: "1h" });

expect(payload.chart.candles).toHaveLength(24);
expect(payload.chart.candles[0].open).toBe(100);
expect(payload.warnings).not.toContain("当前展示的是演示研究切片。");
expect(payload.signal.symbol).toBe("BTC");
```

Also add:

```ts
it("returns an empty-state warning when no candles are stored", async () => {
  const payload = await loadAnalysisPayload({ symbol: "BTC", timeframe: "1h" });
  expect(payload.chart.candles).toEqual([]);
  expect(payload.warnings).toContain("尚未同步市场数据。");
});
```

And:

```ts
it("returns a stale warning when the latest candle is older than the freshness threshold", async () => {
  await seedCandles({ symbol: "BTC", timeframe: "1h", latestOpenTime: staleDate });
  const payload = await loadAnalysisPayload({ symbol: "BTC", timeframe: "1h" });
  expect(payload.warnings).toContain("市场数据可能已滞后。");
});
```

- [ ] **Step 2: Run the focused integration tests and verify they fail**

Run: `pnpm vitest run tests/integration/components/analysis/analysis-data.test.ts tests/integration/api/analysis-route.test.ts`  
Expected: FAIL because the analysis loader still uses demo candles

- [ ] **Step 3: Implement the real-candle reader and analysis loader changes**

Implementation requirements:

- `read-analysis-candles.ts` 负责：
  - 根据 `symbol/timeframe` 查询最近 N 根 `Candle`
  - 返回 candles、latestOpenTime、isStale
- `analysis-data.ts` 改成：
  - 优先读取 `Candle` 表
  - 有数据时使用真实 K 线构造 `chanState` 和 signal
  - 空库时返回空 candles + `尚未同步市场数据。`
  - 数据陈旧时追加 `市场数据可能已滞后。`
  - 移除 demo-slice warnings
- 继续保留现有 viewpoint / marker 生成结构，只最小化改动 K 线来源
- `tests/integration/components/analysis/analysis-data.test.ts` 必须在 `beforeEach/afterEach` 中清理 `db.candle`，保证真实 seed、空状态、陈旧数据三个用例相互隔离

- [ ] **Step 4: Update the API integration test**

Add/update assertions for:

```ts
expect(data.chart.candles[0].open).toBe(100);
expect(data.warnings).not.toContain("当前展示的是演示研究切片。");
```

- [ ] **Step 5: Run the focused integration tests**

Run: `pnpm vitest run tests/integration/components/analysis/analysis-data.test.ts tests/integration/api/analysis-route.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/modules/market-data/read-analysis-candles.ts src/components/analysis/analysis-data.ts tests/integration/components/analysis/analysis-data.test.ts tests/integration/api/analysis-route.test.ts
git commit -m "feat: drive analysis workspace from stored candles"
```

## Task 4: Update Analysis E2E and Finish Verification

**Files:**
- Modify: `tests/e2e/analysis.spec.ts`
- Modify: `tasks/todo.md`

- [ ] **Step 1: Write the failing analysis E2E update**

Seed unique candles directly in the test DB, then assert:

```ts
await page.goto("http://localhost:3000/analysis");
await expect(page.getByText("K 线数：24")).toBeVisible();
await expect(page.getByText("当前展示的是演示研究切片。")).toHaveCount(0);
```

Also keep the existing BTC/ETH + timeframe switch assertions.

- [ ] **Step 2: Run the E2E and verify it fails**

Run: `pnpm exec playwright test tests/e2e/analysis.spec.ts`  
Expected: FAIL until the page reads real candles

- [ ] **Step 3: Implement the test changes and cleanup**

Implementation requirements:

- analysis E2E must use unique seeded candle rows
- the test must clean up its own records in `finally`
- do not use `deleteMany()` without a `where` clause
- add Chinese comments to seeded-data helpers and cleanup logic

- [ ] **Step 4: Run the targeted verification set**

Run: `pnpm vitest run tests/unit/modules/market-data/binance-futures-client.test.ts tests/unit/worker/market-data-sync.test.ts tests/integration/modules/market-data/fetch-and-store-candles.test.ts tests/integration/components/analysis/analysis-data.test.ts tests/integration/api/analysis-route.test.ts`  
Expected: PASS

Run: `pnpm exec playwright test tests/e2e/analysis.spec.ts`  
Expected: PASS

- [ ] **Step 5: Run the full verification set**

Run: `pnpm test`  
Expected: PASS

Run: `pnpm build`  
Expected: PASS

- [ ] **Step 6: Update task tracking and commit**

```bash
git add tests/e2e/analysis.spec.ts tasks/todo.md
git commit -m "test: cover real futures candles in analysis"
```
