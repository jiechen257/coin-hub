# Trader Strategy Research Desk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Coin Hub into a single-page local research desk that records trader decisions, settles trade samples, and generates traceable strategy candidates from those samples.

**Architecture:** Keep the app as a `Next.js` monolith with `Prisma + SQLite`, reuse the current Binance candle pipeline and chart rendering, and replace the multi-page console plus worker stack with a single root page backed by focused domain modules for `records`, `samples`, and `strategies`. Generate strategy candidates synchronously by grouping settled samples on normalized execution-plan fields so every candidate can be traced back to concrete samples and source records.

**Tech Stack:** `Next.js 16`, `React 19`, `TypeScript`, `Tailwind CSS`, `Prisma + SQLite`, `Zod`, `lightweight-charts`, `Vitest`, `Testing Library`, `Playwright`

---

## Implementation Assumptions

- Current branch is `codex/coin-hub-web-console`.
- The existing `market-data` modules stay in place and become the only reused domain slice from the old system.
- The first version treats a trade as `settled` only when both `entryPrice` and `exitPrice` are available.
- Strategy candidate generation groups settled samples by the normalized tuple `marketContext + triggerText + entryText + riskText + exitText`.
- Real-time chart updates use polling through an HTTP route; no WebSocket work is in scope.

## Proposed File Structure

### Keep and Modify

- `package.json`
  Responsibility: remove worker-centric scripts and keep the project runnable with `pnpm dev`.
- `README.md`
  Responsibility: reflect one-command local startup and the new single-page workflow.
- `prisma/schema.prisma`
  Responsibility: replace the legacy auth/job/config/tweet schema with trader research tables.
- `src/lib/db.ts`
  Responsibility: keep the Prisma client bootstrap unchanged except for any schema-driven type fallout.
- `src/modules/market-data/binance-client.ts`
  Responsibility: fetch Binance candles.
- `src/modules/market-data/normalize-candles.ts`
  Responsibility: validate and normalize candle tuples.
- `src/modules/market-data/candle-repository.ts`
  Responsibility: add read helpers used by the research desk and settlement flow.
- `src/modules/market-data/fetch-and-store-candles.ts`
  Responsibility: keep candle refresh logic behind a focused callable function.
- `src/app/layout.tsx`
  Responsibility: retitle the app and keep the global document shell minimal.
- `src/app/page.tsx`
  Responsibility: render the research desk instead of redirecting to login.
- `src/app/globals.css`
  Responsibility: keep the global dark theme while simplifying page-specific assumptions.
- `src/components/analysis/price-chart.tsx`
  Responsibility: keep the chart canvas and support generic trader/plan markers instead of old signal/tweet markers.
- `src/components/analysis/timeframe-switcher.tsx`
  Responsibility: keep timeframe switching.
- `vitest.config.ts`
  Responsibility: update excludes after legacy tests are removed.
- `playwright.config.ts`
  Responsibility: keep a single dev server definition while pointing E2E at the new flow.

### Create

- `src/modules/traders/trader-repository.ts`
  Responsibility: CRUD helpers for trader profiles.
- `src/modules/records/record-schema.ts`
  Responsibility: validate create/update payloads for `trade` and `view` records.
- `src/modules/records/record-repository.ts`
  Responsibility: persist trader records and execution plans.
- `src/modules/records/record-service.ts`
  Responsibility: create records and auto-create the first execution plan for real trades.
- `src/modules/samples/sample-schema.ts`
  Responsibility: validate settlement payloads.
- `src/modules/samples/sample-service.ts`
  Responsibility: settle execution plans into `trade_sample` rows and compute drawdown/holding metrics.
- `src/modules/strategies/candidate-service.ts`
  Responsibility: generate and persist grouped strategy candidates from settled samples.
- `src/components/research-desk/research-desk.tsx`
  Responsibility: top-level client component for the single-page tool.
- `src/components/research-desk/research-desk-data.ts`
  Responsibility: server-side loader for the initial page payload.
- `src/components/research-desk/record-form.tsx`
  Responsibility: create `trade` and `view` records.
- `src/components/research-desk/record-list.tsx`
  Responsibility: render the recent record timeline.
- `src/components/research-desk/record-detail.tsx`
  Responsibility: render the selected record, plans, and settlement controls.
- `src/components/research-desk/strategy-candidate-list.tsx`
  Responsibility: render candidate cards and their traceability links.
- `src/app/api/market/[symbol]/route.ts`
  Responsibility: return normalized candles for one asset/timeframe slice.
- `src/app/api/traders/route.ts`
  Responsibility: list traders and create new ones.
- `src/app/api/trader-records/route.ts`
  Responsibility: list records and create records with execution plans.
- `src/app/api/execution-plans/[planId]/settle/route.ts`
  Responsibility: settle one execution plan synchronously.
- `src/app/api/strategy-candidates/route.ts`
  Responsibility: regenerate and list candidate strategies.
- `tests/unit/research-desk-home.test.tsx`
  Responsibility: smoke test for the new root page.
- `tests/integration/api/market-route.test.ts`
  Responsibility: verify the market polling route.
- `tests/integration/modules/records/record-service.test.ts`
  Responsibility: verify record creation and auto-plan behavior.
- `tests/unit/modules/samples/sample-service.test.ts`
  Responsibility: verify settlement metrics.
- `tests/unit/modules/strategies/candidate-service.test.ts`
  Responsibility: verify candidate grouping.
- `tests/e2e/research-desk.spec.ts`
  Responsibility: verify the single-page happy path.

### Remove

- `src/app/login/page.tsx`
- `src/app/(protected)/layout.tsx`
- `src/app/(protected)/command-center/page.tsx`
- `src/app/(protected)/analysis/page.tsx`
- `src/app/(protected)/config/page.tsx`
- `src/app/(protected)/replay/page.tsx`
- `src/app/(protected)/runs/page.tsx`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/api/dashboard/route.ts`
- `src/app/api/analysis/run/route.ts`
- `src/app/api/analysis/[symbol]/route.ts`
- `src/app/api/replays/route.ts`
- `src/app/api/replays/[jobId]/route.ts`
- `src/app/api/configs/route.ts`
- `src/app/api/configs/[versionId]/activate/route.ts`
- `src/app/api/runs/route.ts`
- `src/app/api/runs/[runId]/route.ts`
- `src/components/app-shell/app-shell.tsx`
- `src/components/command-center/*`
- `src/components/config/config-editor.tsx`
- `src/components/replay/replay-form.tsx`
- `src/components/runs/run-detail.tsx`
- `src/components/analysis/evidence-panel.tsx`
- `src/components/analysis/analysis-data.ts`
- `src/modules/auth/*`
- `src/modules/config/*`
- `src/modules/jobs/*`
- `src/modules/replay/*`
- `src/modules/runs/*`
- `src/modules/signals/*`
- `src/modules/tweets/*`
- `src/modules/chan/*`
- `src/worker/*`
- legacy tests under `tests/e2e/auth.spec.ts`, `tests/e2e/dashboard.spec.ts`, `tests/e2e/config.spec.ts`, `tests/e2e/replay.spec.ts`, `tests/e2e/full-console.spec.ts`, `tests/integration/api/analysis-route.test.ts`, `tests/integration/api/configs-route.test.ts`, `tests/integration/api/dashboard-route.test.ts`, `tests/integration/api/replays-route.test.ts`, `tests/integration/api/runs-route.test.ts`, `tests/integration/auth-service.test.ts`, `tests/integration/config-repository.test.ts`, `tests/integration/modules/jobs/job-service.test.ts`, `tests/integration/modules/replay/replay-evaluator.test.ts`, `tests/integration/modules/runs/run-orchestrator.test.ts`, `tests/integration/modules/tweets/tweet-source.test.ts`, `tests/integration/worker/worker-index.test.ts`, `tests/unit/config-editor-language.test.tsx`, `tests/unit/layout-language.test.tsx`, `tests/unit/run-detail-language.test.tsx`, `tests/unit/modules/config/config-service.test.ts`, `tests/unit/modules/signals/build-trade-signal.test.ts`, `tests/unit/modules/tweets/attribute-viewpoints.test.ts`, `tests/unit/modules/chan/build-chan-state.test.ts`, `tests/unit/worker/scheduler-command.test.ts`

## Task 1: Collapse the App Into One Root Research Desk

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`
- Create: `src/components/research-desk/research-desk.tsx`
- Create: `tests/unit/research-desk-home.test.tsx`
- Remove: `src/app/login/page.tsx`
- Remove: `src/app/(protected)/layout.tsx`
- Remove: `src/app/(protected)/command-center/page.tsx`
- Remove: `src/app/(protected)/analysis/page.tsx`
- Remove: `src/app/(protected)/config/page.tsx`
- Remove: `src/app/(protected)/replay/page.tsx`
- Remove: `src/app/(protected)/runs/page.tsx`

- [ ] **Step 1: Write the failing root-page smoke test**

```tsx
import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

it("renders the trader strategy research desk shell", async () => {
  render(await HomePage());

  expect(screen.getByRole("heading", { name: "交易员策略研究台" })).toBeInTheDocument();
  expect(screen.getByText("记录流")).toBeInTheDocument();
  expect(screen.getByText("候选策略")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the smoke test to verify it fails**

Run: `pnpm vitest tests/unit/research-desk-home.test.tsx`
Expected: FAIL because the page still redirects to login and the new shell does not exist.

- [ ] **Step 3: Replace the root shell with the first working research-desk shell**

```tsx
// src/app/page.tsx
import { ResearchDesk } from "@/components/research-desk/research-desk";

export default async function HomePage() {
  return (
    <main className="min-h-screen px-6 py-8">
      <ResearchDesk
        initialData={{
          selection: { symbol: "BTC", timeframe: "1h" },
          traders: [],
          records: [],
          selectedRecordId: null,
          candidates: [],
          chart: { candles: [], markers: [] },
        }}
      />
    </main>
  );
}
```

```tsx
// src/components/research-desk/research-desk.tsx
type ResearchDeskProps = {
  initialData: {
    selection: { symbol: "BTC" | "ETH"; timeframe: "15m" | "1h" | "4h" | "1d" };
    traders: unknown[];
    records: unknown[];
    selectedRecordId: string | null;
    candidates: unknown[];
    chart: { candles: unknown[]; markers: unknown[] };
  };
};

export function ResearchDesk({ initialData }: ResearchDeskProps) {
  return (
    <section className="grid gap-6">
      <header className="space-y-2">
        <p className="text-sm text-sky-300">Coin Hub</p>
        <h1 className="text-4xl font-semibold text-white">交易员策略研究台</h1>
      </header>
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)_320px]">
        <section className="rounded-lg border border-white/10 p-4">记录流</section>
        <section className="rounded-lg border border-white/10 p-4">K 线主视图</section>
        <section className="rounded-lg border border-white/10 p-4">候选策略</section>
      </div>
    </section>
  );
}
```

```tsx
// src/app/layout.tsx
export const metadata = {
  title: "Coin Hub | 交易员策略研究台",
  description: "记录交易员决策、结算样本、沉淀候选策略的本地研究工具",
};
```

- [ ] **Step 4: Remove the legacy protected pages and rerun the smoke test**

Run: `git rm 'src/app/login/page.tsx' 'src/app/(protected)/layout.tsx' 'src/app/(protected)/command-center/page.tsx' 'src/app/(protected)/analysis/page.tsx' 'src/app/(protected)/config/page.tsx' 'src/app/(protected)/replay/page.tsx' 'src/app/(protected)/runs/page.tsx'`
Expected: the old navigation shell is removed and only the root page remains.

Run: `pnpm vitest tests/unit/research-desk-home.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app src/components/research-desk tests/unit/research-desk-home.test.tsx
git commit -m "refactor(app): 收缩为单页研究台骨架"
```

## Task 2: Replace the Prisma Schema With Trader Research Models

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/db.ts`
- Create: `src/modules/traders/trader-repository.ts`
- Create: `src/modules/records/record-repository.ts`
- Test: `tests/integration/modules/records/record-service.test.ts`

- [ ] **Step 1: Write the failing repository integration test**

```ts
import { db } from "@/lib/db";
import { createTraderRecord } from "@/modules/records/record-repository";

it("stores a trader record with its execution plan", async () => {
  const trader = await db.traderProfile.create({
    data: { name: "Trader A", platform: "manual" },
  });

  const record = await createTraderRecord({
    traderId: trader.id,
    symbol: "BTC",
    recordType: "trade",
    sourceType: "manual",
    occurredAt: new Date("2026-04-16T08:00:00.000Z"),
    rawContent: "BTC 多单，68000 开，69000 平",
    plans: [
      {
        label: "real-trade",
        side: "long",
        entryPrice: 68000,
        exitPrice: 69000,
        marketContext: "trend",
        triggerText: "follow breakout",
        entryText: "enter on trader fill",
        riskText: "stop below last swing",
        exitText: "exit on trader close",
      },
    ],
  });

  expect(record.executionPlans).toHaveLength(1);
  expect(record.executionPlans[0]?.label).toBe("real-trade");
});
```

- [ ] **Step 2: Run the integration test to verify it fails**

Run: `pnpm vitest tests/integration/modules/records/record-service.test.ts`
Expected: FAIL because the new tables and repository do not exist.

- [ ] **Step 3: Replace the schema with the new research tables**

```prisma
model TraderProfile {
  id        String         @id @default(cuid())
  name      String
  platform  String?
  notes     String?
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
  records   TraderRecord[]
}

model TraderRecord {
  id          String          @id @default(cuid())
  traderId    String
  symbol      String
  timeframe   String?
  recordType  String
  sourceType  String
  occurredAt  DateTime
  rawContent  String
  notes       String?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  trader      TraderProfile   @relation(fields: [traderId], references: [id], onDelete: Cascade)
  executionPlans ExecutionPlan[]

  @@index([symbol, occurredAt])
}

model ExecutionPlan {
  id            String        @id @default(cuid())
  recordId      String
  label         String
  status        String        @default("draft")
  side          String
  entryPrice    Float?
  exitPrice     Float?
  stopLoss      Float?
  takeProfit    Float?
  marketContext String?
  triggerText   String
  entryText     String
  riskText      String?
  exitText      String?
  notes         String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  record        TraderRecord  @relation(fields: [recordId], references: [id], onDelete: Cascade)
  sample        TradeSample?
}

model TradeSample {
  id                 String              @id @default(cuid())
  planId             String              @unique
  settledAt          DateTime
  entryPrice         Float
  exitPrice          Float
  pnlValue           Float
  pnlPercent         Float
  holdingMinutes     Int
  maxDrawdownPercent Float?
  resultTag          String
  notes              String?
  plan               ExecutionPlan       @relation(fields: [planId], references: [id], onDelete: Cascade)
  strategyLinks      StrategyCandidateSample[]
}

model StrategyCandidate {
  id            String                    @id @default(cuid())
  marketContext String?
  triggerText   String
  entryText     String
  riskText      String?
  exitText      String?
  sampleCount   Int
  winRate       Float
  createdAt     DateTime                  @default(now())
  updatedAt     DateTime                  @updatedAt
  samples       StrategyCandidateSample[]
}

model StrategyCandidateSample {
  candidateId String
  sampleId    String
  candidate   StrategyCandidate @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  sample      TradeSample        @relation(fields: [sampleId], references: [id], onDelete: Cascade)

  @@id([candidateId, sampleId])
}
```

- [ ] **Step 4: Add the minimal repositories and migrate the database**

```ts
// src/modules/records/record-repository.ts
import { db } from "@/lib/db";

type CreateRecordInput = {
  traderId: string;
  symbol: "BTC" | "ETH";
  recordType: "trade" | "view";
  sourceType: "manual" | "twitter" | "telegram" | "discord" | "custom-import";
  occurredAt: Date;
  rawContent: string;
  notes?: string;
  plans: Array<{
    label: string;
    side: "long" | "short";
    entryPrice?: number;
    exitPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    marketContext?: string;
    triggerText: string;
    entryText: string;
    riskText?: string;
    exitText?: string;
    notes?: string;
  }>;
};

export async function createTraderRecord(input: CreateRecordInput) {
  return db.traderRecord.create({
    data: {
      traderId: input.traderId,
      symbol: input.symbol,
      recordType: input.recordType,
      sourceType: input.sourceType,
      occurredAt: input.occurredAt,
      rawContent: input.rawContent,
      notes: input.notes,
      executionPlans: {
        create: input.plans.map((plan) => ({
          ...plan,
          status: plan.entryPrice && plan.exitPrice ? "ready" : "draft",
        })),
      },
    },
    include: { executionPlans: true },
  });
}
```

Run: `pnpm prisma migrate dev --name trader_research_desk`
Expected: Prisma creates the new migration and generates the client for the new schema.

- [ ] **Step 5: Run the integration test and commit**

Run: `pnpm vitest tests/integration/modules/records/record-service.test.ts`
Expected: PASS

```bash
git add prisma/schema.prisma prisma/migrations src/lib/db.ts src/modules/traders src/modules/records tests/integration/modules/records/record-service.test.ts
git commit -m "refactor(data): 切换交易员研究数据模型"
```

## Task 3: Reuse Market Data for the Research Desk

**Files:**
- Modify: `src/modules/market-data/candle-repository.ts`
- Modify: `src/modules/market-data/fetch-and-store-candles.ts`
- Create: `src/app/api/market/[symbol]/route.ts`
- Create: `src/components/research-desk/research-desk-data.ts`
- Test: `tests/integration/api/market-route.test.ts`

- [ ] **Step 1: Write the failing market route test**

```ts
import { GET } from "@/app/api/market/[symbol]/route";
import { db } from "@/lib/db";

it("returns candles for one symbol and timeframe", async () => {
  await db.candle.create({
    data: {
      symbol: "BTC",
      timeframe: "1h",
      openTime: new Date("2026-04-16T00:00:00.000Z"),
      open: 68000,
      high: 68100,
      low: 67900,
      close: 68050,
      volume: 10,
      source: "binance",
    },
  });

  const response = await GET(
    new Request("http://localhost:3000/api/market/BTC?timeframe=1h"),
    { params: Promise.resolve({ symbol: "BTC" }) },
  );

  const payload = await response.json();

  expect(payload.symbol).toBe("BTC");
  expect(payload.candles).toHaveLength(1);
});
```

- [ ] **Step 2: Run the market route test to verify it fails**

Run: `pnpm vitest tests/integration/api/market-route.test.ts`
Expected: FAIL because the route and candle list helper do not exist.

- [ ] **Step 3: Add candle read helpers and the market route**

```ts
// src/modules/market-data/candle-repository.ts
export async function listCandles(input: {
  symbol: string;
  timeframe: CandleTimeframe;
  limit?: number;
}) {
  return db.candle.findMany({
    where: { symbol: input.symbol, timeframe: input.timeframe },
    orderBy: { openTime: "asc" },
    take: input.limit ?? 500,
  });
}

export const candleRepository: CandleRepository & {
  listCandles: typeof listCandles;
} = {
  storeCandles,
  listCandles,
};
```

```ts
// src/app/api/market/[symbol]/route.ts
import { NextResponse } from "next/server";
import { candleRepository } from "@/modules/market-data/candle-repository";
import { fetchAndStoreCandles } from "@/modules/market-data/fetch-and-store-candles";

export async function GET(request: Request, context: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await context.params;
  const timeframe = new URL(request.url).searchParams.get("timeframe") ?? "1h";

  let candles = await candleRepository.listCandles({ symbol, timeframe: timeframe as "15m" | "1h" | "4h" | "1d" });

  if (candles.length === 0) {
    await fetchAndStoreCandles([symbol], { timeframes: [timeframe as "15m" | "1h" | "4h" | "1d"] });
    candles = await candleRepository.listCandles({ symbol, timeframe: timeframe as "15m" | "1h" | "4h" | "1d" });
  }

  return NextResponse.json({ symbol, timeframe, candles });
}
```

- [ ] **Step 4: Build the server-side research desk loader**

```ts
// src/components/research-desk/research-desk-data.ts
import { db } from "@/lib/db";
import { candleRepository } from "@/modules/market-data/candle-repository";

export async function loadResearchDeskPayload(input: {
  symbol: "BTC" | "ETH";
  timeframe: "15m" | "1h" | "4h" | "1d";
}) {
  const [traders, records, candidates, candles] = await Promise.all([
    db.traderProfile.findMany({ orderBy: { name: "asc" } }),
    db.traderRecord.findMany({
      include: { trader: true, executionPlans: { include: { sample: true } } },
      orderBy: { occurredAt: "desc" },
      take: 20,
    }),
    db.strategyCandidate.findMany({
      include: { samples: { include: { sample: { include: { plan: { include: { record: true } } } } } } },
      orderBy: [{ sampleCount: "desc" }, { updatedAt: "desc" }],
    }),
    candleRepository.listCandles({ symbol: input.symbol, timeframe: input.timeframe }),
  ]);

  return {
    selection: input,
    traders,
    records,
    selectedRecordId: records[0]?.id ?? null,
    candidates,
    chart: { candles, markers: [] },
  };
}
```

- [ ] **Step 5: Run the route test and commit**

Run: `pnpm vitest tests/integration/api/market-route.test.ts`
Expected: PASS

```bash
git add src/modules/market-data src/app/api/market src/components/research-desk/research-desk-data.ts tests/integration/api/market-route.test.ts
git commit -m "feat(market): 接入研究台行情读取"
```

## Task 4: Add Record Creation and Execution Plan Management

**Files:**
- Create: `src/modules/records/record-schema.ts`
- Create: `src/modules/records/record-service.ts`
- Create: `src/app/api/traders/route.ts`
- Create: `src/app/api/trader-records/route.ts`
- Modify: `src/modules/records/record-repository.ts`
- Test: `tests/integration/modules/records/record-service.test.ts`

- [ ] **Step 1: Extend the record-service test with both record types**

```ts
import { createRecordFromInput } from "@/modules/records/record-service";
import { db } from "@/lib/db";

it("creates a trade record with an automatic ready plan", async () => {
  const trader = await db.traderProfile.create({ data: { name: "Trader Auto" } });

  const record = await createRecordFromInput({
    traderId: trader.id,
    symbol: "BTC",
    recordType: "trade",
    sourceType: "manual",
    occurredAt: "2026-04-16T08:00:00.000Z",
    rawContent: "68000 开多，69000 平多",
    plans: [],
    trade: {
      side: "long",
      entryPrice: 68000,
      exitPrice: 69000,
      marketContext: "trend",
      triggerText: "follow breakout",
      entryText: "copy trader fill",
      riskText: "stop below 67200",
      exitText: "close with trader",
    },
  });

  expect(record.executionPlans[0]?.status).toBe("ready");
});

it("creates a view record with multiple draft plans", async () => {
  const trader = await db.traderProfile.create({ data: { name: "Trader View" } });

  const record = await createRecordFromInput({
    traderId: trader.id,
    symbol: "ETH",
    recordType: "view",
    sourceType: "manual",
    occurredAt: "2026-04-16T09:00:00.000Z",
    rawContent: "ETH 回踩仍偏多",
    plans: [
      {
        label: "plan-a",
        side: "long",
        marketContext: "trend",
        triggerText: "retest support",
        entryText: "enter on reclaim",
      },
      {
        label: "plan-b",
        side: "long",
        marketContext: "trend",
        triggerText: "break prior high",
        entryText: "enter on breakout",
      },
    ],
  });

  expect(record.executionPlans).toHaveLength(2);
  expect(record.executionPlans.every((plan) => plan.status === "draft")).toBe(true);
});
```

- [ ] **Step 2: Run the record-service test to verify it fails**

Run: `pnpm vitest tests/integration/modules/records/record-service.test.ts`
Expected: FAIL because `createRecordFromInput` and the new schemas do not exist.

- [ ] **Step 3: Add Zod validation and the record service**

```ts
// src/modules/records/record-schema.ts
import { z } from "zod";

export const executionPlanInputSchema = z.object({
  label: z.string().min(1),
  side: z.enum(["long", "short"]),
  entryPrice: z.number().positive().optional(),
  exitPrice: z.number().positive().optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  marketContext: z.string().min(1).optional(),
  triggerText: z.string().min(1),
  entryText: z.string().min(1),
  riskText: z.string().min(1).optional(),
  exitText: z.string().min(1).optional(),
  notes: z.string().min(1).optional(),
});

export const createRecordSchema = z.object({
  traderId: z.string().min(1),
  symbol: z.enum(["BTC", "ETH"]),
  recordType: z.enum(["trade", "view"]),
  sourceType: z.enum(["manual", "twitter", "telegram", "discord", "custom-import"]),
  occurredAt: z.string().datetime(),
  rawContent: z.string().min(1),
  notes: z.string().min(1).optional(),
  trade: executionPlanInputSchema.optional(),
  plans: z.array(executionPlanInputSchema).default([]),
});
```

```ts
// src/modules/records/record-service.ts
import { createRecordSchema } from "@/modules/records/record-schema";
import { createTraderRecord } from "@/modules/records/record-repository";

export async function createRecordFromInput(input: unknown) {
  const parsed = createRecordSchema.parse(input);

  const plans =
    parsed.recordType === "trade" && parsed.trade
      ? [
          {
            ...parsed.trade,
            label: "real-trade",
            entryPrice: parsed.trade.entryPrice,
            exitPrice: parsed.trade.exitPrice,
          },
        ]
      : parsed.plans;

  return createTraderRecord({
    traderId: parsed.traderId,
    symbol: parsed.symbol,
    recordType: parsed.recordType,
    sourceType: parsed.sourceType,
    occurredAt: new Date(parsed.occurredAt),
    rawContent: parsed.rawContent,
    notes: parsed.notes,
    plans,
  });
}
```

- [ ] **Step 4: Add trader and record HTTP routes**

```ts
// src/app/api/traders/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const traders = await db.traderProfile.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ traders });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { name: string; platform?: string; notes?: string };
  const trader = await db.traderProfile.create({ data: body });
  return NextResponse.json({ trader }, { status: 201 });
}
```

```ts
// src/app/api/trader-records/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createRecordFromInput } from "@/modules/records/record-service";

export async function GET() {
  const records = await db.traderRecord.findMany({
    include: { trader: true, executionPlans: { include: { sample: true } } },
    orderBy: { occurredAt: "desc" },
  });

  return NextResponse.json({ records });
}

export async function POST(request: Request) {
  const record = await createRecordFromInput(await request.json());
  return NextResponse.json({ record }, { status: 201 });
}
```

- [ ] **Step 5: Run the integration test and commit**

Run: `pnpm vitest tests/integration/modules/records/record-service.test.ts`
Expected: PASS

```bash
git add src/modules/records src/app/api/traders src/app/api/trader-records tests/integration/modules/records/record-service.test.ts
git commit -m "feat(records): 支持交易记录与观点方案录入"
```

## Task 5: Add Sample Settlement and Candidate Generation

**Files:**
- Create: `src/modules/samples/sample-schema.ts`
- Create: `src/modules/samples/sample-service.ts`
- Create: `src/modules/strategies/candidate-service.ts`
- Create: `src/app/api/execution-plans/[planId]/settle/route.ts`
- Create: `src/app/api/strategy-candidates/route.ts`
- Test: `tests/unit/modules/samples/sample-service.test.ts`
- Test: `tests/unit/modules/strategies/candidate-service.test.ts`

- [ ] **Step 1: Write the failing sample settlement test**

```ts
import { settleExecutionPlan } from "@/modules/samples/sample-service";

it("settles a long plan and computes pnl metrics", async () => {
  const sample = await settleExecutionPlan({
    planId: "plan-1",
    entryPrice: 68000,
    exitPrice: 69000,
    settledAt: "2026-04-16T10:00:00.000Z",
    candleSeries: [
      { openTime: new Date("2026-04-16T08:00:00.000Z"), low: 67900, high: 68100, open: 68000, close: 68050 },
      { openTime: new Date("2026-04-16T09:00:00.000Z"), low: 67800, high: 69100, open: 68050, close: 69000 },
    ],
    side: "long",
  });

  expect(sample.pnlValue).toBe(1000);
  expect(sample.pnlPercent).toBeCloseTo(1.4705, 4);
  expect(sample.holdingMinutes).toBe(120);
  expect(sample.maxDrawdownPercent).toBeCloseTo(-0.2941, 4);
});
```

- [ ] **Step 2: Write the failing candidate-generation test**

```ts
import { buildStrategyCandidates } from "@/modules/strategies/candidate-service";

it("groups settled samples by normalized plan fields", () => {
  const candidates = buildStrategyCandidates([
    {
      id: "sample-1",
      pnlPercent: 2,
      resultTag: "win",
      plan: {
        marketContext: "trend",
        triggerText: "follow breakout",
        entryText: "enter on reclaim",
        riskText: "stop below swing",
        exitText: "exit at prior high",
      },
    },
    {
      id: "sample-2",
      pnlPercent: -1,
      resultTag: "loss",
      plan: {
        marketContext: "trend",
        triggerText: "follow breakout",
        entryText: "enter on reclaim",
        riskText: "stop below swing",
        exitText: "exit at prior high",
      },
    },
  ]);

  expect(candidates).toHaveLength(1);
  expect(candidates[0]?.sampleCount).toBe(2);
  expect(candidates[0]?.winRate).toBe(0.5);
});
```

- [ ] **Step 3: Run the two tests to verify they fail**

Run: `pnpm vitest tests/unit/modules/samples/sample-service.test.ts tests/unit/modules/strategies/candidate-service.test.ts`
Expected: FAIL because neither service exists.

- [ ] **Step 4: Implement settlement and candidate grouping**

```ts
// src/modules/samples/sample-service.ts
import { db } from "@/lib/db";

function round(value: number) {
  return Math.round(value * 10_000) / 10_000;
}

export async function settleExecutionPlan(input: {
  planId: string;
  entryPrice: number;
  exitPrice: number;
  settledAt: string;
  candleSeries: Array<{ openTime: Date; low: number; high: number; open: number; close: number }>;
  side: "long" | "short";
  notes?: string;
}) {
  const direction = input.side === "long" ? 1 : -1;
  const pnlValue = round((input.exitPrice - input.entryPrice) * direction);
  const pnlPercent = round((pnlValue / input.entryPrice) * 100);
  const startTime = input.candleSeries[0]?.openTime ?? new Date(input.settledAt);
  const holdingMinutes = Math.round((new Date(input.settledAt).getTime() - startTime.getTime()) / 60_000);

  const maxDrawdownPercent = round(
    Math.min(
      0,
      ...input.candleSeries.map((candle) =>
        input.side === "long"
          ? ((candle.low - input.entryPrice) / input.entryPrice) * 100
          : ((input.entryPrice - candle.high) / input.entryPrice) * 100,
      ),
    ),
  );

  const resultTag = pnlValue > 0 ? "win" : pnlValue < 0 ? "loss" : "flat";

  return db.tradeSample.upsert({
    where: { planId: input.planId },
    create: {
      planId: input.planId,
      settledAt: new Date(input.settledAt),
      entryPrice: input.entryPrice,
      exitPrice: input.exitPrice,
      pnlValue,
      pnlPercent,
      holdingMinutes,
      maxDrawdownPercent,
      resultTag,
      notes: input.notes,
    },
    update: {
      settledAt: new Date(input.settledAt),
      entryPrice: input.entryPrice,
      exitPrice: input.exitPrice,
      pnlValue,
      pnlPercent,
      holdingMinutes,
      maxDrawdownPercent,
      resultTag,
      notes: input.notes,
    },
  });
}
```

```ts
// src/modules/strategies/candidate-service.ts
function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function buildCandidateKey(plan: {
  marketContext?: string | null;
  triggerText: string;
  entryText: string;
  riskText?: string | null;
  exitText?: string | null;
}) {
  return [
    normalize(plan.marketContext),
    normalize(plan.triggerText),
    normalize(plan.entryText),
    normalize(plan.riskText),
    normalize(plan.exitText),
  ].join("||");
}

export function buildStrategyCandidates(samples: Array<{
  id: string;
  pnlPercent: number;
  resultTag: string;
  plan: {
    marketContext?: string | null;
    triggerText: string;
    entryText: string;
    riskText?: string | null;
    exitText?: string | null;
  };
}>) {
  const groups = new Map<string, typeof samples>();

  for (const sample of samples) {
    const key = buildCandidateKey(sample.plan);
    groups.set(key, [...(groups.get(key) ?? []), sample]);
  }

  return [...groups.entries()].map(([key, group]) => ({
    key,
    marketContext: group[0]?.plan.marketContext ?? null,
    triggerText: group[0]!.plan.triggerText,
    entryText: group[0]!.plan.entryText,
    riskText: group[0]!.plan.riskText ?? null,
    exitText: group[0]!.plan.exitText ?? null,
    sampleCount: group.length,
    winRate: group.filter((sample) => sample.resultTag === "win").length / group.length,
    sampleIds: group.map((sample) => sample.id),
  }));
}
```

- [ ] **Step 5: Add the settlement and regeneration routes**

```ts
// src/app/api/execution-plans/[planId]/settle/route.ts
import { NextResponse } from "next/server";
import { candleRepository } from "@/modules/market-data/candle-repository";
import { settleExecutionPlan } from "@/modules/samples/sample-service";
import { db } from "@/lib/db";

export async function POST(request: Request, context: { params: Promise<{ planId: string }> }) {
  const { planId } = await context.params;
  const body = (await request.json()) as { entryPrice: number; exitPrice: number; settledAt: string; notes?: string };
  const plan = await db.executionPlan.findUniqueOrThrow({ where: { id: planId }, include: { record: true } });
  const candles = await candleRepository.listCandles({ symbol: plan.record.symbol, timeframe: (plan.record.timeframe ?? "1h") as "15m" | "1h" | "4h" | "1d" });

  const sample = await settleExecutionPlan({
    planId,
    entryPrice: body.entryPrice,
    exitPrice: body.exitPrice,
    settledAt: body.settledAt,
    notes: body.notes,
    candleSeries: candles,
    side: plan.side as "long" | "short",
  });

  await db.executionPlan.update({ where: { id: planId }, data: { status: "settled", entryPrice: body.entryPrice, exitPrice: body.exitPrice } });

  return NextResponse.json({ sample });
}
```

```ts
// src/app/api/strategy-candidates/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildStrategyCandidates } from "@/modules/strategies/candidate-service";

export async function POST() {
  const samples = await db.tradeSample.findMany({
    include: { plan: true },
  });

  const candidates = buildStrategyCandidates(samples);

  await db.$transaction(async (tx) => {
    await tx.strategyCandidateSample.deleteMany();
    await tx.strategyCandidate.deleteMany();

    for (const candidate of candidates) {
      const created = await tx.strategyCandidate.create({
        data: {
          marketContext: candidate.marketContext,
          triggerText: candidate.triggerText,
          entryText: candidate.entryText,
          riskText: candidate.riskText,
          exitText: candidate.exitText,
          sampleCount: candidate.sampleCount,
          winRate: candidate.winRate,
        },
      });

      await tx.strategyCandidateSample.createMany({
        data: candidate.sampleIds.map((sampleId) => ({
          candidateId: created.id,
          sampleId,
        })),
      });
    }
  });

  return NextResponse.json({ regenerated: candidates.length });
}
```

- [ ] **Step 6: Run the tests and commit**

Run: `pnpm vitest tests/unit/modules/samples/sample-service.test.ts tests/unit/modules/strategies/candidate-service.test.ts`
Expected: PASS

```bash
git add src/modules/samples src/modules/strategies src/app/api/execution-plans src/app/api/strategy-candidates tests/unit/modules/samples/sample-service.test.ts tests/unit/modules/strategies/candidate-service.test.ts
git commit -m "feat(strategy): 支持样本结算与候选策略归纳"
```

## Task 6: Build the Full Research Desk UI

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/analysis/price-chart.tsx`
- Modify: `src/components/analysis/timeframe-switcher.tsx`
- Create: `src/components/research-desk/record-form.tsx`
- Create: `src/components/research-desk/record-list.tsx`
- Create: `src/components/research-desk/record-detail.tsx`
- Create: `src/components/research-desk/strategy-candidate-list.tsx`
- Modify: `src/components/research-desk/research-desk.tsx`
- Test: `tests/e2e/research-desk.spec.ts`

- [ ] **Step 1: Write the failing E2E happy-path test**

```ts
import { test, expect } from "@playwright/test";

test("creates a trader record, settles a plan, and regenerates candidates", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("交易员名称").fill("Trader A");
  await page.getByRole("button", { name: "新增交易员" }).click();

  await page.getByLabel("原始记录").fill("BTC 68000 开多，69000 平多");
  await page.getByRole("radio", { name: "真实开单" }).check();
  await page.getByLabel("入场价").fill("68000");
  await page.getByLabel("出场价").fill("69000");
  await page.getByRole("button", { name: "保存记录" }).click();

  await expect(page.getByText("real-trade")).toBeVisible();
  await page.getByRole("button", { name: "归纳候选策略" }).click();
  await expect(page.getByText("样本数 1")).toBeVisible();
});
```

- [ ] **Step 2: Run the E2E test to verify it fails**

Run: `pnpm playwright test tests/e2e/research-desk.spec.ts`
Expected: FAIL because the page is still a static scaffold.

- [ ] **Step 3: Build the record form, list, detail panel, and candidate list**

```tsx
// src/components/research-desk/record-form.tsx
export function RecordForm() {
  return (
    <form className="grid gap-3 rounded-lg border border-white/10 p-4">
      <label className="grid gap-1 text-sm">
        <span>交易员名称</span>
        <input aria-label="交易员名称" className="rounded-md bg-slate-900 px-3 py-2" />
      </label>
      <label className="grid gap-1 text-sm">
        <span>原始记录</span>
        <textarea aria-label="原始记录" className="min-h-24 rounded-md bg-slate-900 px-3 py-2" />
      </label>
      <div className="flex gap-4 text-sm">
        <label><input type="radio" name="recordType" value="trade" /> 真实开单</label>
        <label><input type="radio" name="recordType" value="view" /> 行情观点</label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input aria-label="入场价" className="rounded-md bg-slate-900 px-3 py-2" />
        <input aria-label="出场价" className="rounded-md bg-slate-900 px-3 py-2" />
      </div>
      <button type="submit" className="rounded-md bg-emerald-400 px-4 py-2 font-medium text-slate-950">保存记录</button>
    </form>
  );
}
```

```tsx
// src/components/research-desk/strategy-candidate-list.tsx
type CandidateCard = {
  id: string;
  marketContext: string | null;
  triggerText: string;
  entryText: string;
  riskText: string | null;
  exitText: string | null;
  sampleCount: number;
  winRate: number;
};

export function StrategyCandidateList({ candidates }: { candidates: CandidateCard[] }) {
  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">候选策略</h2>
        <button type="button" className="rounded-md border border-white/15 px-3 py-2 text-sm text-white">
          归纳候选策略
        </button>
      </div>
      {candidates.map((candidate) => (
        <article key={candidate.id} className="rounded-lg border border-white/10 p-4">
          <p className="text-sm text-sky-300">{candidate.marketContext ?? "未分类市场"}</p>
          <h3 className="mt-1 text-lg font-semibold text-white">{candidate.triggerText}</h3>
          <p className="mt-2 text-sm text-slate-300">入场：{candidate.entryText}</p>
          <p className="text-sm text-slate-300">止盈止损：{candidate.exitText ?? "手动定义"} / {candidate.riskText ?? "手动定义"}</p>
          <p className="mt-3 text-sm text-slate-400">样本数 {candidate.sampleCount} · 胜率 {(candidate.winRate * 100).toFixed(0)}%</p>
        </article>
      ))}
    </section>
  );
}
```

- [ ] **Step 4: Wire the page to the new loader and generic chart markers**

```tsx
// src/app/page.tsx
import { ResearchDesk } from "@/components/research-desk/research-desk";
import { loadResearchDeskPayload } from "@/components/research-desk/research-desk-data";

export default async function HomePage() {
  const initialData = await loadResearchDeskPayload({ symbol: "BTC", timeframe: "1h" });

  return (
    <main className="min-h-screen px-6 py-8">
      <ResearchDesk initialData={initialData} />
    </main>
  );
}
```

```tsx
// src/components/analysis/price-chart.tsx
type ResearchMarker = {
  time: string;
  position: "aboveBar" | "belowBar" | "inBar";
  label: string;
  text: string;
  tone: "bullish" | "bearish" | "neutral";
};

export function PriceChart(props: {
  symbol: string;
  timeframe: string;
  candles: Array<{ openTime: string; open: number; high: number; low: number; close: number; volume: number | null }>;
  markers: ResearchMarker[];
}) {
  const formattedMarkers = props.markers.map((marker) => ({
    time: marker.time,
    position: marker.position,
    shape: marker.position === "aboveBar" ? "arrowDown" : "arrowUp",
    color: marker.tone === "bullish" ? "#34d399" : marker.tone === "bearish" ? "#f87171" : "#fbbf24",
    text: `${marker.label} ${marker.text}`,
  }));

  return <div data-symbol={props.symbol} data-timeframe={props.timeframe} data-marker-count={formattedMarkers.length} />;
}
```

- [ ] **Step 5: Run the E2E test and commit**

Run: `pnpm playwright test tests/e2e/research-desk.spec.ts`
Expected: PASS

```bash
git add src/app/page.tsx src/components/analysis/price-chart.tsx src/components/analysis/timeframe-switcher.tsx src/components/research-desk tests/e2e/research-desk.spec.ts
git commit -m "feat(ui): 搭建交易员研究台交互闭环"
```

## Task 7: Remove Legacy Modules, Simplify Scripts, and Verify End-to-End

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Modify: `vitest.config.ts`
- Modify: `playwright.config.ts`
- Remove: legacy API routes, components, modules, worker files, and legacy tests listed in the file-structure section

- [ ] **Step 1: Delete the legacy app/API/module/test surface**

```bash
git rm src/app/api/auth/login/route.ts \
  src/app/api/auth/logout/route.ts \
  src/app/api/dashboard/route.ts \
  'src/app/api/analysis/[symbol]/route.ts' \
  src/app/api/analysis/run/route.ts \
  src/app/api/replays/route.ts \
  'src/app/api/replays/[jobId]/route.ts' \
  src/app/api/configs/route.ts \
  'src/app/api/configs/[versionId]/activate/route.ts' \
  src/app/api/runs/route.ts \
  'src/app/api/runs/[runId]/route.ts' \
  src/components/app-shell/app-shell.tsx \
  src/components/command-center/asset-signal-card.tsx \
  src/components/command-center/command-center-dashboard.tsx \
  src/components/command-center/risk-panel.tsx \
  src/components/config/config-editor.tsx \
  src/components/replay/replay-form.tsx \
  src/components/runs/run-detail.tsx \
  src/components/analysis/evidence-panel.tsx \
  src/components/analysis/analysis-data.ts \
  src/modules/auth/auth-service.ts \
  src/modules/config/config-repository.ts \
  src/modules/config/config-schema.ts \
  src/modules/config/config-service.ts \
  src/modules/jobs/job-service.ts \
  src/modules/replay/replay-evaluator.ts \
  src/modules/runs/result-aggregator.ts \
  src/modules/runs/run-orchestrator.ts \
  src/modules/signals/build-trade-signal.ts \
  src/modules/signals/confidence.ts \
  src/modules/tweets/attribute-viewpoints.ts \
  src/modules/tweets/llm-summary.ts \
  src/modules/tweets/tweet-repository.ts \
  src/modules/tweets/tweet-source.ts \
  src/modules/chan/build-chan-state.ts \
  src/modules/chan/types.ts \
  src/worker/index.ts \
  src/worker/process-job.ts \
  src/worker/scheduler.ts
```

- [ ] **Step 2: Remove worker-centric scripts and obsolete test globs**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:e2e": "playwright test"
  }
}
```

```ts
// vitest.config.ts
test: {
  environment: "jsdom",
  fileParallelism: false,
  globals: true,
  setupFiles: ["./src/test/setup.ts"],
}
```

- [ ] **Step 3: Rewrite the README for one-command startup**

```md
# Coin Hub

Coin Hub 是一个本地交易员策略研究台。

## 本地启动

1. `nvm use`
2. `pnpm install`
3. `pnpm prisma migrate dev`
4. `pnpm dev`

打开 `http://localhost:3000`，在同一个页面里录入交易记录、结算样本、归纳候选策略。
```

- [ ] **Step 4: Run the full verification suite**

Run: `pnpm test`
Expected: PASS

Run: `pnpm test:e2e`
Expected: PASS

Run: `pnpm next build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json README.md vitest.config.ts playwright.config.ts src tests
git commit -m "refactor(cleanup): 清理旧控制台并收口单命令启动"
```
