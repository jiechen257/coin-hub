# 当前任务

## 已完成

- [x] 梳理项目入口与页面，确认用户可见功能
- [x] 梳理 API 与领域模块，确认后台能力与数据流
- [x] 结合数据模型与测试，输出有代码出处的功能总结

## Binance 合约 K 线接入

- [x] 完成现状分析分段确认
- [x] 完成功能点与方案选型分段确认
- [x] 完成风险与关键决策分段确认
- [x] 形成轻量 Spec 并等待用户 HARD-GATE 确认
- [x] 确认后进入实现计划
- [x] 实现计划审阅通过并选择执行方式

## Binance 合约 K 线接入实现

- [x] Task 1: Binance Futures K 线采集接入
- [x] Task 2: 独立行情同步循环
- [x] Task 3: 分析页真实读库
- [x] Task 4: 分析页 E2E 与最终验证

## Binance 历史 K 线回填

- [x] 完成现状分析分段确认
- [x] 完成功能点与方案选型分段确认
- [x] 完成风险与关键决策分段确认
- [x] 形成轻量 Spec 并等待用户 HARD-GATE 确认
- [x] 确认后进入实现计划

## Binance 历史 K 线回填实现

- [x] Task 1: Proxy-aware fetch 基础能力
- [x] Task 2: Public data zip / CSV 解析
- [x] Task 3: 回填计划与写库
- [x] Task 4: CLI 与现场回填

## 策略控制台信息架构改造

- [x] 完成现状分析分段确认
- [x] 完成功能点分段确认
- [x] 完成风险与关键决策分段确认
- [x] 形成轻量 Spec 并等待用户 HARD-GATE 确认
- [x] 确认后进入实现计划
- [x] 实现计划审阅通过并选择执行方式
- [x] 选择执行方式并开始实现

## 实现执行

- [x] Task 1: 首页聚合服务与测试
- [x] Task 2: 首页聚合 API 与测试
- [x] Task 3: 根路由与导航骨架改造
- [x] Task 4: 首页总览 UI 与快速操作
- [x] Task 5: 旧命令中心路由迁移与回归测试
- [x] Task 6: 最终验证

## Review

- 已完成代码走读，结论基于页面入口、API、领域模块、数据模型与 E2E/集成测试交叉验证。
- 当前项目是单用户策略控制台，配置管理、命令中心、回放、运行历史可直接使用；分析工作台仍以演示数据驱动。
- 首页改造轻量 Spec 已写入 `docs/2026-04-11-strategy-console-overview-light-spec.md`，并通过独立审阅。
- 实现计划已写入 `docs/2026-04-11-strategy-console-overview-implementation-plan.md`，并通过独立审阅。
- Task 1 已完成：新增 `getOverviewPayload()` 聚合服务与集成测试，补齐市场摘要、资产、配置摘要的完整 schema，并覆盖空状态与“无快照但仍有操作数据”的场景，已通过 `pnpm vitest run tests/integration/modules/overview/overview-service.test.ts`。
- Task 2 已完成：新增 `/api/overview` 薄封装路由与 API 集成测试，确认路由直接复用 `getOverviewPayload()`，已通过 `pnpm vitest run tests/integration/api/overview-route.test.ts tests/integration/modules/overview/overview-service.test.ts`。
- Task 3 已完成：根路由不再重定向，首页与共享导航骨架已落地，并通过 `pnpm vitest run tests/unit/app-shell-smoke.test.tsx` 与 `pnpm playwright test tests/e2e/overview-entry.spec.ts`。
- Task 4 已完成：首页已接入真实总览数据、快速操作与操作面板，并通过规格复审、代码质量复审，以及 `pnpm vitest run tests/integration/modules/overview/overview-service.test.ts tests/integration/api/overview-route.test.ts tests/integration/api/dashboard-route.test.ts`、`pnpm exec playwright test tests/e2e/overview.spec.ts --project=chromium` 验证。
- Task 5 已完成：旧 `/command-center` 已重定向回首页，总览入口相关回归用例已迁移，并通过 `pnpm test:e2e -- tests/e2e/dashboard.spec.ts tests/e2e/full-console.spec.ts` 验证。
- Task 6 已完成：最终验证已通过，`pnpm vitest run tests/integration/modules/overview/overview-service.test.ts tests/integration/api/overview-route.test.ts tests/unit/app-shell-smoke.test.tsx`、`pnpm exec playwright test tests/e2e/overview.spec.ts tests/e2e/overview-entry.spec.ts tests/e2e/dashboard.spec.ts tests/e2e/full-console.spec.ts`、`pnpm test` 与 `pnpm build` 全部成功。
- Binance 合约 K 线接入已完成：新增 Binance USDⓈ-M Futures REST client、独立行情同步循环与真实 Candle 读库链路，分析页不再依赖 demo candles。
- 针对本次改动，已通过 `pnpm vitest run tests/unit/modules/market-data/binance-futures-client.test.ts tests/unit/worker/market-data-sync.test.ts tests/integration/modules/market-data/fetch-and-store-candles.test.ts tests/integration/components/analysis/analysis-data.test.ts tests/integration/api/analysis-route.test.ts tests/integration/worker/worker-index.test.ts`、`pnpm exec playwright test tests/e2e/analysis.spec.ts --project=chromium`、`pnpm test` 与 `pnpm build` 验证。
- 已尝试执行一次真实 Binance 数据同步以填充本地 SQLite，但当前环境访问 `https://fapi.binance.com` 时出现 TLS `ECONNRESET`，因此本地数据库未能在此轮自动灌入真实 K 线；代码层已补 `BINANCE_FUTURES_BASE_URL` 以便后续接代理或镜像源。
- Binance 官方历史 K 线回填已完成：新增 public-data 下载客户端、zip/CSV 解析器、回填 orchestrator 与手动 CLI，真实历史数据已落入 `Candle` 表。
- 历史回填验证已通过：`pnpm vitest run tests/unit/modules/market-data/binance-public-data-parser.test.ts tests/unit/modules/market-data/backfill-historical-candles.test.ts tests/integration/modules/market-data/backfill-historical-candles.test.ts tests/unit/modules/market-data/binance-futures-client.test.ts` 与 `pnpm build` 全部成功。
- 现场回填命令 `pnpm exec tsx scripts/backfill-historical-candles.ts` 已执行成功，结果为 `processedCandles=92456`、`downloadedArchives=320`、`skippedArchives=8`；当前库内计数为 BTC/ETH `15m=34944`、`1h=8736`、`4h=2184`、`1d=364`。
