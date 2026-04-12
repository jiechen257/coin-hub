# Binance 官方历史 K 线回填 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从 Binance 官方 `data.binance.vision` 回填 BTC/ETH 的历史 USD-M Futures K 线到 `Candle` 表，让分析页立即具备真实历史图表数据。

**Architecture:** 新增独立的 public-data 下载客户端、zip/CSV 解析器和回填 orchestrator，按“partial month 用 daily、完整 month 用 monthly”的规则生成下载计划，并复用现有 `normalizeCandles()` + `candleRepository.storeCandles()` 做幂等写库。通过单独 CLI 脚本手动触发，不挂入现有 worker 常驻链。

**Tech Stack:** Next.js / TypeScript / Prisma + SQLite / Vitest / Binance `data.binance.vision` / `undici` / `fflate`

---

## File Map

### Create

- `src/modules/market-data/proxy-aware-fetch.ts` — 显式让 Node 市场数据请求遵循代理环境变量
- `src/modules/market-data/binance-public-data-client.ts` — 下载 monthly / daily zip 归档
- `src/modules/market-data/binance-public-data-parser.ts` — 解压 zip 并解析 Binance CSV 为 `RawCandle[]`
- `src/modules/market-data/backfill-historical-candles.ts` — 生成回填计划并落库
- `scripts/backfill-historical-candles.ts` — 手动执行历史回填 CLI
- `tests/unit/modules/market-data/binance-public-data-parser.test.ts`
- `tests/unit/modules/market-data/backfill-historical-candles.test.ts`
- `tests/integration/modules/market-data/backfill-historical-candles.test.ts`

### Modify

- `src/modules/market-data/binance-futures-client.ts` — 改为复用 `proxy-aware-fetch`
- `package.json` — 增加依赖与回填命令
- `.env.example` — 增加 `BINANCE_PUBLIC_DATA_BASE_URL`
- `tasks/todo.md` — 记录实现与验证结果

## Task 1: Proxy-aware fetch 基础能力

**Files:**
- Create: `src/modules/market-data/proxy-aware-fetch.ts`
- Modify: `src/modules/market-data/binance-futures-client.ts`
- Test: `tests/unit/modules/market-data/binance-futures-client.test.ts`

- [ ] 写出或保留能证明 futures client 行为的测试
- [ ] 实现共享代理 fetch，优先走 `HTTPS_PROXY/HTTP_PROXY`
- [ ] 让 futures client 复用共享代理 fetch
- [ ] 跑 `pnpm vitest run tests/unit/modules/market-data/binance-futures-client.test.ts`

## Task 2: Public data zip / CSV 解析

**Files:**
- Create: `src/modules/market-data/binance-public-data-client.ts`
- Create: `src/modules/market-data/binance-public-data-parser.ts`
- Test: `tests/unit/modules/market-data/binance-public-data-parser.test.ts`

- [ ] 先写 parser 失败测试：zip 内单个 CSV 文件能解析成 `RawCandle[]`
- [ ] 跑测试确认失败
- [ ] 用 `fflate` 实现 zip 解压与 CSV 解析
- [ ] 处理空 zip / 非 CSV / 非法数值报错
- [ ] 跑 `pnpm vitest run tests/unit/modules/market-data/binance-public-data-parser.test.ts`

## Task 3: 回填计划与写库

**Files:**
- Create: `src/modules/market-data/backfill-historical-candles.ts`
- Test: `tests/unit/modules/market-data/backfill-historical-candles.test.ts`
- Test: `tests/integration/modules/market-data/backfill-historical-candles.test.ts`

- [ ] 先写计划生成测试：最近区间能拆成“起始月 daily + 中间月 monthly + 结束月 daily”
- [ ] 再写集成测试：用 fake client + sqlite 验证写库、`source=binance-public-data`、重复执行幂等
- [ ] 跑测试确认失败
- [ ] 实现回填 orchestrator，复用 `normalizeCandles()` 与 `candleRepository.storeCandles()`
- [ ] 缺失文件（404）跳过，其余下载错误直接失败
- [ ] 跑 `pnpm vitest run tests/unit/modules/market-data/backfill-historical-candles.test.ts tests/integration/modules/market-data/backfill-historical-candles.test.ts`

## Task 4: CLI 与现场回填

**Files:**
- Create: `scripts/backfill-historical-candles.ts`
- Modify: `package.json`
- Modify: `.env.example`

- [ ] 新增 CLI 脚本与 `pnpm backfill:candles` 命令
- [ ] CLI 输出资产、周期、处理条数、跳过文件数
- [ ] 跑一次真实回填命令
- [ ] 验证 `Candle` 表已有真实历史 K 线，分析页不再空状态

## Verification

- `pnpm vitest run tests/unit/modules/market-data/binance-futures-client.test.ts tests/unit/modules/market-data/binance-public-data-parser.test.ts tests/unit/modules/market-data/backfill-historical-candles.test.ts tests/integration/modules/market-data/backfill-historical-candles.test.ts`
- `pnpm exec tsx scripts/backfill-historical-candles.ts`
- `pnpm exec tsx --eval 'import { db } from "./src/lib/db.ts"; void (async () => { console.log(await db.candle.count()); await db.$disconnect(); })();'`

