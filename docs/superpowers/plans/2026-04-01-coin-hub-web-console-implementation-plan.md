# Coin Hub Web Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack single-repo web console that analyzes `BTC` and `ETH`, shows dual-asset strategy conclusions in a Web UI, supports replay and config versioning, and keeps the strategy engine testable outside the UI.

**Architecture:** Use a `Next.js` monolith for the UI and HTTP interface, keep the strategy engine in isolated TypeScript domain modules under `src/modules`, and run manual analysis, scheduled analysis, and replay as database-backed async jobs processed by a separate worker. Persist candles, tweets, config versions, run snapshots, and jobs with `Prisma` on `SQLite` first, while keeping the schema easy to move to `PostgreSQL` later.

**Tech Stack:** `Next.js 15`, `React 19`, `TypeScript`, `Tailwind CSS`, `Prisma + SQLite`, `Zod`, `lightweight-charts`, `Vitest`, `Testing Library`, `Playwright`, `node-cron`, `tsx`

---

## Implementation Assumptions

- Current workspace is not yet a Git repository, so Task 1 includes `git init`.
- Package manager is `pnpm`.
- First phase uses `SQLite` for local speed and simplicity.
- Worker jobs use a database-backed queue so the same design can later run as `web + worker`.
- Authentication is single-user only and implemented as a password-protected session cookie.

## Proposed File Structure

### Root and Tooling

- `package.json`
  Responsibility: scripts, dependencies, lint/test/build commands.
- `pnpm-workspace.yaml`
  Responsibility: workspace declaration even if phase 1 uses a single app package.
- `tsconfig.json`
  Responsibility: TypeScript compiler options and path aliases.
- `next.config.ts`
  Responsibility: Next runtime configuration.
- `postcss.config.mjs`
  Responsibility: Tailwind/PostCSS integration.
- `tailwind.config.ts`
  Responsibility: design tokens and content globs.
- `vitest.config.ts`
  Responsibility: unit and integration test config.
- `playwright.config.ts`
  Responsibility: browser E2E test config.
- `.env.example`
  Responsibility: required env vars for auth, database, and external APIs.

### Persistence

- `prisma/schema.prisma`
  Responsibility: schema for candles, tweets, attributed viewpoints, config versions, jobs, and run snapshots.
- `prisma/seed.ts`
  Responsibility: initial config version and demo auth seed.

### App Shell

- `src/app/layout.tsx`
  Responsibility: global shell, fonts, metadata.
- `src/app/page.tsx`
  Responsibility: root entry that redirects to `/login` or `/command-center` based on session.
- `src/app/login/page.tsx`
  Responsibility: single-user login screen.
- `src/app/(protected)/layout.tsx`
  Responsibility: auth-protected navigation shell.
- `src/app/(protected)/command-center/page.tsx`
  Responsibility: `Command Center`.
- `src/app/(protected)/analysis/page.tsx`
  Responsibility: `Analysis Workspace`.
- `src/app/(protected)/replay/page.tsx`
  Responsibility: `Replay Lab`.
- `src/app/(protected)/config/page.tsx`
  Responsibility: `Strategy Config`.
- `src/app/(protected)/runs/page.tsx`
  Responsibility: `Run History`.

### API Routes

- `src/app/api/auth/login/route.ts`
  Responsibility: login handler.
- `src/app/api/auth/logout/route.ts`
  Responsibility: logout handler.
- `src/app/api/dashboard/route.ts`
  Responsibility: dual-asset dashboard payload for `Command Center`.
- `src/app/api/analysis/run/route.ts`
  Responsibility: submit a manual dual-asset analysis job.
- `src/app/api/analysis/[symbol]/route.ts`
  Responsibility: single-asset research payload.
- `src/app/api/replays/route.ts`
  Responsibility: submit replay jobs and list replay summaries.
- `src/app/api/replays/[jobId]/route.ts`
  Responsibility: replay detail/status endpoint.
- `src/app/api/configs/route.ts`
  Responsibility: list config versions and save a new one.
- `src/app/api/configs/[versionId]/activate/route.ts`
  Responsibility: set an existing config version active.
- `src/app/api/runs/route.ts`
  Responsibility: list runs.
- `src/app/api/runs/[runId]/route.ts`
  Responsibility: run detail endpoint.

### Domain Modules

- `src/modules/auth/auth-service.ts`
  Responsibility: password check, cookie session helpers.
- `src/modules/config/config-service.ts`
  Responsibility: create, validate, activate, and fetch config versions.
- `src/modules/market-data/binance-client.ts`
  Responsibility: fetch raw candles from Binance.
- `src/modules/market-data/normalize-candles.ts`
  Responsibility: normalize and validate candle sequences.
- `src/modules/market-data/candle-repository.ts`
  Responsibility: persistence and query helpers for candles.
- `src/modules/chan/build-chan-state.ts`
  Responsibility: derive `ChanState` from normalized candles.
- `src/modules/tweets/tweet-source.ts`
  Responsibility: fetch or import StargazerBTC raw tweets.
- `src/modules/tweets/attribute-viewpoints.ts`
  Responsibility: rule extraction and optional LLM summary.
- `src/modules/signals/build-trade-signal.ts`
  Responsibility: combine `ChanState` and viewpoints into `TradeSignal`.
- `src/modules/runs/run-orchestrator.ts`
  Responsibility: coordinate `BTC` and `ETH` analysis in one run.
- `src/modules/runs/result-aggregator.ts`
  Responsibility: build `RunResult` and run-level warnings.
- `src/modules/replay/replay-evaluator.ts`
  Responsibility: run historical replay and evaluation metrics.
- `src/modules/jobs/job-service.ts`
  Responsibility: enqueue jobs, claim jobs, update status.

### Worker and Scheduler

- `src/worker/process-job.ts`
  Responsibility: execute a single analysis or replay job.
- `src/worker/index.ts`
  Responsibility: poll queue and run workers.
- `src/worker/scheduler.ts`
  Responsibility: schedule recurring dual-asset analysis jobs.

### UI Components

- `src/components/app-shell/app-shell.tsx`
  Responsibility: protected navigation shell.
- `src/components/command-center/asset-signal-card.tsx`
  Responsibility: asset summary card for `BTC`/`ETH`.
- `src/components/command-center/risk-panel.tsx`
  Responsibility: high-priority warnings.
- `src/components/analysis/price-chart.tsx`
  Responsibility: chart canvas with candle, structure, signal, and tweet markers.
- `src/components/analysis/evidence-panel.tsx`
  Responsibility: signal evidence and warnings.
- `src/components/replay/replay-form.tsx`
  Responsibility: replay input form.
- `src/components/config/config-editor.tsx`
  Responsibility: versioned strategy config editor.
- `src/components/runs/run-detail.tsx`
  Responsibility: dual-asset run result detail.

### Tests

- `tests/unit/...`
  Responsibility: pure logic tests for normalization, chan, signal, config, attribution.
- `tests/integration/...`
  Responsibility: repository, API route, and job orchestration tests.
- `tests/e2e/auth.spec.ts`
  Responsibility: login flow.
- `tests/e2e/dashboard.spec.ts`
  Responsibility: command center and manual run flow.
- `tests/e2e/replay.spec.ts`
  Responsibility: replay submission and result viewing.
- `tests/e2e/config.spec.ts`
  Responsibility: config save and activation flow.

## Task 1: Bootstrap Repository and App Shell

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `tailwind.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `.env.example`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Test: `tests/unit/app-shell-smoke.test.tsx`

- [ ] **Step 1: Write the failing smoke test for the app shell**

```tsx
import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

it("renders the bootstrap shell with Coin Hub title", () => {
  render(<HomePage />);
  expect(screen.getByText("Coin Hub")).toBeInTheDocument();
  expect(screen.getByText("Web Strategy Console")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/unit/app-shell-smoke.test.tsx`
Expected: FAIL because the project files and component do not exist yet.

- [ ] **Step 3: Initialize the repository and toolchain**

```bash
git init
pnpm init
pnpm add next react react-dom zod lightweight-charts @prisma/client
pnpm add -D typescript @types/node @types/react @types/react-dom tailwindcss postcss autoprefixer vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom playwright tsx prisma node-cron
```

- [ ] **Step 4: Write the minimal app shell and config files**

```tsx
export default function HomePage() {
  return (
    <main>
      <h1>Coin Hub</h1>
      <p>Web Strategy Console</p>
    </main>
  );
}
```

- [ ] **Step 5: Run the smoke test and the dev build**

Run: `pnpm vitest tests/unit/app-shell-smoke.test.tsx`
Expected: PASS

Run: `pnpm next build`
Expected: PASS with a successful production build.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: bootstrap nextjs web console"
```

## Task 2: Define the Database Schema and Persistence Base

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `src/lib/db.ts`
- Create: `src/modules/config/config-schema.ts`
- Create: `src/modules/config/config-repository.ts`
- Test: `tests/integration/config-repository.test.ts`

- [ ] **Step 1: Write the failing persistence test**

```ts
import { createConfigVersion, getActiveConfigVersion } from "@/modules/config/config-repository";

it("stores and returns the active strategy config version", async () => {
  await createConfigVersion({ summary: "initial", params: { riskPct: 1 } });
  const active = await getActiveConfigVersion();
  expect(active?.summary).toBe("initial");
  expect(active?.params.riskPct).toBe(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/integration/config-repository.test.ts`
Expected: FAIL because Prisma schema, client, and repository do not exist yet.

- [ ] **Step 3: Add Prisma models and DB bootstrap**

```prisma
model ConfigVersion {
  id         String   @id @default(cuid())
  summary    String
  paramsJson Json
  isActive   Boolean  @default(false)
  createdAt  DateTime @default(now())
}
```

- [ ] **Step 4: Implement the repository and seed**

```ts
export async function getActiveConfigVersion() {
  return prisma.configVersion.findFirst({ where: { isActive: true } });
}
```

- [ ] **Step 5: Run migration, seed, and tests**

Run: `pnpm prisma migrate dev --name init`
Expected: PASS and create the SQLite database.

Run: `pnpm tsx prisma/seed.ts`
Expected: PASS and insert an initial config version.

Run: `pnpm vitest tests/integration/config-repository.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add prisma src/lib/db.ts src/modules/config tests/integration/config-repository.test.ts
git commit -m "feat: add persistence base and config repository"
```

## Task 3: Add Single-User Auth and Protected App Shell

**Files:**
- Create: `src/lib/env.ts`
- Create: `src/modules/auth/auth-service.ts`
- Create: `src/app/login/page.tsx`
- Modify: `src/app/page.tsx`
- Create: `src/app/(protected)/layout.tsx`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/components/app-shell/app-shell.tsx`
- Test: `tests/integration/auth-service.test.ts`
- Test: `tests/e2e/auth.spec.ts`

- [ ] **Step 1: Write the failing auth unit test**

```ts
import { verifyLogin } from "@/modules/auth/auth-service";

it("accepts the configured single-user password", async () => {
  const ok = await verifyLogin("secret-pass");
  expect(ok).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/integration/auth-service.test.ts`
Expected: FAIL because env handling and auth service do not exist yet.

- [ ] **Step 3: Implement env loading, cookie session logic, and login route**

```ts
export async function verifyLogin(password: string) {
  return password === env.APP_PASSWORD;
}
```

- [ ] **Step 4: Implement protected layout and login page**

```tsx
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
```

```tsx
export default async function RootPage() {
  redirect("/login");
}
```

- [ ] **Step 5: Run auth tests**

Run: `pnpm vitest tests/integration/auth-service.test.ts`
Expected: PASS

Run: `pnpm playwright test tests/e2e/auth.spec.ts`
Expected: PASS and login redirects into the protected shell.

- [ ] **Step 6: Commit**

```bash
git add src/lib/env.ts src/modules/auth src/app/login src/app/api/auth src/components/app-shell tests/integration/auth-service.test.ts tests/e2e/auth.spec.ts
git commit -m "feat: add single-user auth shell"
```

## Task 4: Implement Strategy Config Versioning

**Files:**
- Create: `src/modules/config/config-service.ts`
- Create: `src/app/api/configs/route.ts`
- Create: `src/app/api/configs/[versionId]/activate/route.ts`
- Create: `src/app/(protected)/config/page.tsx`
- Create: `src/components/config/config-editor.tsx`
- Test: `tests/unit/modules/config/config-service.test.ts`
- Test: `tests/integration/api/configs-route.test.ts`

- [ ] **Step 1: Write the failing config service test**

```ts
import { saveNewConfigVersion } from "@/modules/config/config-service";

it("creates a new version instead of mutating the active one", async () => {
  const created = await saveNewConfigVersion({
    summary: "raise confidence threshold",
    params: { confidenceThreshold: 0.7 },
  });
  expect(created.id).toBeDefined();
  expect(created.isActive).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/unit/modules/config/config-service.test.ts`
Expected: FAIL because versioning service is not implemented.

- [ ] **Step 3: Implement config validation and activation rules**

```ts
export async function saveNewConfigVersion(input: SaveConfigInput) {
  const parsed = configSchema.parse(input.params);
  return createAndActivateConfigVersion({ summary: input.summary, params: parsed });
}
```

- [ ] **Step 4: Build config API and page**

```tsx
<ConfigEditor currentVersion={currentVersion} versions={versions} />
```

- [ ] **Step 5: Run service and route tests**

Run: `pnpm vitest tests/unit/modules/config/config-service.test.ts tests/integration/api/configs-route.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/modules/config src/app/api/configs src/app/(protected)/config src/components/config tests/unit/modules/config/config-service.test.ts tests/integration/api/configs-route.test.ts
git commit -m "feat: add versioned strategy config management"
```

## Task 5: Build Market Data Ingestion and Candle Normalization

**Files:**
- Create: `src/modules/market-data/binance-client.ts`
- Create: `src/modules/market-data/normalize-candles.ts`
- Create: `src/modules/market-data/candle-repository.ts`
- Create: `src/modules/market-data/fetch-and-store-candles.ts`
- Test: `tests/unit/modules/market-data/normalize-candles.test.ts`
- Test: `tests/integration/modules/market-data/fetch-and-store-candles.test.ts`

- [ ] **Step 1: Write the failing candle normalization test**

```ts
import { normalizeCandles } from "@/modules/market-data/normalize-candles";

it("sorts candles and rejects duplicate open times", () => {
  expect(() =>
    normalizeCandles([
      { openTime: 2, open: 1, high: 2, low: 1, close: 2 },
      { openTime: 2, open: 1, high: 2, low: 1, close: 2 },
    ])
  ).toThrow("duplicate candle openTime");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/unit/modules/market-data/normalize-candles.test.ts`
Expected: FAIL because the module does not exist yet.

- [ ] **Step 3: Implement raw fetch, normalization, and repository writes**

```ts
export function normalizeCandles(raw: RawCandle[]) {
  const sorted = [...raw].sort((a, b) => a.openTime - b.openTime);
  return sorted;
}
```

- [ ] **Step 4: Add ingestion service for `BTC` and `ETH` across all required timeframes**

```ts
export async function fetchAndStoreCandles(symbols = ["BTC", "ETH"]) {
  // iterate over symbols and 15m/1h/4h/1d, then persist normalized candles
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm vitest tests/unit/modules/market-data/normalize-candles.test.ts tests/integration/modules/market-data/fetch-and-store-candles.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/modules/market-data tests/unit/modules/market-data/normalize-candles.test.ts tests/integration/modules/market-data/fetch-and-store-candles.test.ts
git commit -m "feat: add market data ingestion and normalization"
```

## Task 6: Implement Chan Analyzer and Signal Engine

**Files:**
- Create: `src/modules/chan/types.ts`
- Create: `src/modules/chan/build-chan-state.ts`
- Create: `src/modules/signals/build-trade-signal.ts`
- Create: `src/modules/signals/confidence.ts`
- Test: `tests/unit/modules/chan/build-chan-state.test.ts`
- Test: `tests/unit/modules/signals/build-trade-signal.test.ts`

- [ ] **Step 1: Write the failing ChanState test**

```ts
import { buildChanState } from "@/modules/chan/build-chan-state";

it("returns a structure summary for a valid candle sequence", () => {
  const state = buildChanState(makeTrendingCandles());
  expect(state.structureSummary).toContain("trend");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/unit/modules/chan/build-chan-state.test.ts`
Expected: FAIL because Chan analyzer files do not exist yet.

- [ ] **Step 3: Implement minimal but testable structure derivation**

```ts
export function buildChanState(candles: Candle[]): ChanState {
  return {
    symbol: candles[0]?.symbol ?? "BTC",
    trendBias: "up",
    structureSummary: "trend up with valid segment",
    fractals: [],
    strokes: [],
    segments: [],
    zs: [],
    keyLevels: [],
    timeframeStates: {},
  };
}
```

- [ ] **Step 4: Implement the signal builder and confidence rules**

```ts
export function buildTradeSignal(input: BuildSignalInput): TradeSignal {
  return {
    symbol: input.symbol,
    bias: input.chanState.trendBias === "up" ? "long" : "wait",
    confidence: deriveConfidence(input),
    evidence: input.evidence,
  } as TradeSignal;
}
```

- [ ] **Step 5: Run signal and chan tests**

Run: `pnpm vitest tests/unit/modules/chan/build-chan-state.test.ts tests/unit/modules/signals/build-trade-signal.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/modules/chan src/modules/signals tests/unit/modules/chan/build-chan-state.test.ts tests/unit/modules/signals/build-trade-signal.test.ts
git commit -m "feat: add chan analyzer and signal engine baseline"
```

## Task 7: Add Tweet Ingestion and Viewpoint Attribution

**Files:**
- Create: `src/modules/tweets/tweet-source.ts`
- Create: `src/modules/tweets/tweet-repository.ts`
- Create: `src/modules/tweets/attribute-viewpoints.ts`
- Create: `src/modules/tweets/llm-summary.ts`
- Test: `tests/unit/modules/tweets/attribute-viewpoints.test.ts`
- Test: `tests/integration/modules/tweets/tweet-source.test.ts`

- [ ] **Step 1: Write the failing attribution test**

```ts
import { attributeViewpoint } from "@/modules/tweets/attribute-viewpoints";

it("extracts bias and symbol from a bullish BTC tweet", async () => {
  const result = await attributeViewpoint({
    id: "1",
    text: "BTC looks ready to break higher",
    publishedAt: new Date().toISOString(),
  });
  expect(result.symbol).toBe("BTC");
  expect(result.bias).toBe("bullish");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/unit/modules/tweets/attribute-viewpoints.test.ts`
Expected: FAIL because tweet modules do not exist yet.

- [ ] **Step 3: Implement raw tweet fetch/import and rule-based extraction**

```ts
export async function attributeViewpoint(tweet: RawTweet) {
  const symbol = /ETH/i.test(tweet.text) ? "ETH" : "BTC";
  const bias = /higher|long|bull/i.test(tweet.text) ? "bullish" : "neutral";
  return { tweetId: tweet.id, symbol, bias, confidence: 0.6 };
}
```

- [ ] **Step 4: Add optional LLM summary with graceful fallback**

```ts
export async function summarizeReasoning(tweet: RawTweet) {
  try {
    return await callModel(tweet.text);
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm vitest tests/unit/modules/tweets/attribute-viewpoints.test.ts tests/integration/modules/tweets/tweet-source.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/modules/tweets tests/unit/modules/tweets/attribute-viewpoints.test.ts tests/integration/modules/tweets/tweet-source.test.ts
git commit -m "feat: add tweet ingestion and attribution"
```

## Task 8: Implement Run Orchestration, Replay, and Job Queue

**Files:**
- Create: `src/modules/runs/run-orchestrator.ts`
- Create: `src/modules/runs/result-aggregator.ts`
- Create: `src/modules/replay/replay-evaluator.ts`
- Create: `src/modules/jobs/job-service.ts`
- Create: `src/worker/process-job.ts`
- Create: `src/worker/index.ts`
- Create: `src/worker/scheduler.ts`
- Test: `tests/integration/modules/runs/run-orchestrator.test.ts`
- Test: `tests/integration/modules/replay/replay-evaluator.test.ts`
- Test: `tests/integration/modules/jobs/job-service.test.ts`

- [ ] **Step 1: Write the failing run orchestration test**

```ts
import { runDualAssetAnalysis } from "@/modules/runs/run-orchestrator";

it("returns a RunResult with BTC and ETH asset entries", async () => {
  const result = await runDualAssetAnalysis({ mode: "manual" });
  expect(result.assets.BTC).toBeDefined();
  expect(result.assets.ETH).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/integration/modules/runs/run-orchestrator.test.ts`
Expected: FAIL because orchestration and job modules do not exist yet.

- [ ] **Step 3: Implement dual-asset orchestration and result aggregation**

```ts
export async function runDualAssetAnalysis(input: RunInput): Promise<RunResult> {
  const btc = await analyzeSymbol("BTC", input);
  const eth = await analyzeSymbol("ETH", input);
  return aggregateRunResult({ btc, eth, mode: input.mode });
}
```

- [ ] **Step 4: Implement replay evaluator and DB-backed jobs**

```ts
export async function enqueueJob(type: "analysis" | "replay", payload: unknown) {
  return prisma.job.create({ data: { type, payloadJson: payload as never, status: "queued" } });
}
```

- [ ] **Step 5: Run integration tests**

Run: `pnpm vitest tests/integration/modules/runs/run-orchestrator.test.ts tests/integration/modules/replay/replay-evaluator.test.ts tests/integration/modules/jobs/job-service.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/modules/runs src/modules/replay src/modules/jobs src/worker tests/integration/modules/runs/run-orchestrator.test.ts tests/integration/modules/replay/replay-evaluator.test.ts tests/integration/modules/jobs/job-service.test.ts
git commit -m "feat: add orchestration replay and job queue"
```

## Task 9: Build Dashboard APIs and Command Center

**Files:**
- Create: `src/app/api/dashboard/route.ts`
- Create: `src/app/api/analysis/run/route.ts`
- Create: `src/app/(protected)/command-center/page.tsx`
- Create: `src/components/command-center/asset-signal-card.tsx`
- Create: `src/components/command-center/risk-panel.tsx`
- Test: `tests/integration/api/dashboard-route.test.ts`
- Test: `tests/e2e/dashboard.spec.ts`

- [ ] **Step 1: Write the failing dashboard route test**

```ts
import { GET } from "@/app/api/dashboard/route";

it("returns BTC and ETH cards for the command center", async () => {
  const response = await GET();
  const data = await response.json();
  expect(data.assets.BTC).toBeDefined();
  expect(data.assets.ETH).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/integration/api/dashboard-route.test.ts`
Expected: FAIL because dashboard route is missing.

- [ ] **Step 3: Implement dashboard and manual-run endpoints**

```ts
export async function GET() {
  const latest = await getLatestRunResult();
  return Response.json(latest);
}
```

- [ ] **Step 4: Build the command center page**

```tsx
<AssetSignalCard symbol="BTC" data={data.assets.BTC} />
<AssetSignalCard symbol="ETH" data={data.assets.ETH} />
```

- [ ] **Step 5: Run route and E2E tests**

Run: `pnpm vitest tests/integration/api/dashboard-route.test.ts`
Expected: PASS

Run: `pnpm playwright test tests/e2e/dashboard.spec.ts`
Expected: PASS and the page can submit a dual-asset analysis job.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/dashboard src/app/api/analysis/run src/app/(protected)/command-center/page.tsx src/components/command-center tests/integration/api/dashboard-route.test.ts tests/e2e/dashboard.spec.ts
git commit -m "feat: add command center dashboard"
```

## Task 10: Build Analysis Workspace and Charted Research View

**Files:**
- Create: `src/app/api/analysis/[symbol]/route.ts`
- Create: `src/app/(protected)/analysis/page.tsx`
- Create: `src/components/analysis/price-chart.tsx`
- Create: `src/components/analysis/evidence-panel.tsx`
- Create: `src/components/analysis/timeframe-switcher.tsx`
- Test: `tests/integration/api/analysis-route.test.ts`
- Test: `tests/e2e/analysis.spec.ts`

- [ ] **Step 1: Write the failing research payload test**

```ts
import { GET } from "@/app/api/analysis/[symbol]/route";

it("returns chart markers, viewpoints, and the selected asset signal", async () => {
  const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ symbol: "BTC" }) } as never);
  const data = await response.json();
  expect(data.chart.candles.length).toBeGreaterThan(0);
  expect(data.signal.symbol).toBe("BTC");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/integration/api/analysis-route.test.ts`
Expected: FAIL because analysis detail route does not exist.

- [ ] **Step 3: Implement the analysis detail route and chart view-model builder**

```ts
return Response.json({
  chart: { candles, structureMarkers, signalMarkers, tweetMarkers },
  signal,
  evidence,
  warnings,
});
```

- [ ] **Step 4: Build the chart and workspace page**

```tsx
<PriceChart candles={data.chart.candles} markers={data.chart.signalMarkers} />
<EvidencePanel signal={data.signal} warnings={data.warnings} />
```

- [ ] **Step 5: Run route and browser tests**

Run: `pnpm vitest tests/integration/api/analysis-route.test.ts`
Expected: PASS

Run: `pnpm playwright test tests/e2e/analysis.spec.ts`
Expected: PASS and the UI can switch `BTC/ETH` and timeframe tabs.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/analysis src/app/(protected)/analysis src/components/analysis tests/integration/api/analysis-route.test.ts tests/e2e/analysis.spec.ts
git commit -m "feat: add analysis workspace with charted research view"
```

## Task 11: Build Replay Lab, Run History, and Config UX

**Files:**
- Create: `src/app/api/replays/route.ts`
- Create: `src/app/api/replays/[jobId]/route.ts`
- Create: `src/app/api/runs/route.ts`
- Create: `src/app/api/runs/[runId]/route.ts`
- Create: `src/app/(protected)/replay/page.tsx`
- Create: `src/app/(protected)/runs/page.tsx`
- Create: `src/components/replay/replay-form.tsx`
- Create: `src/components/runs/run-detail.tsx`
- Test: `tests/integration/api/replays-route.test.ts`
- Test: `tests/integration/api/runs-route.test.ts`
- Test: `tests/e2e/replay.spec.ts`
- Test: `tests/e2e/config.spec.ts`

- [ ] **Step 1: Write the failing replay submission test**

```ts
import { POST } from "@/app/api/replays/route";

it("creates a replay job for a selected time range and config version", async () => {
  const response = await POST(
    new Request("http://localhost/api/replays", {
      method: "POST",
      body: JSON.stringify({ from: "2026-01-01", to: "2026-02-01", configVersion: "v1" }),
    })
  );
  const data = await response.json();
  expect(data.jobId).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/integration/api/replays-route.test.ts`
Expected: FAIL because replay routes are not implemented.

- [ ] **Step 3: Implement replay and run routes plus UI pages**

```ts
export async function POST(request: Request) {
  const body = await request.json();
  const job = await enqueueJob("replay", body);
  return Response.json({ jobId: job.id }, { status: 202 });
}
```

- [ ] **Step 4: Build Replay Lab and Run History pages**

```tsx
<ReplayForm versions={versions} />
<RunDetail run={selectedRun} />
```

- [ ] **Step 5: Run integration and browser tests**

Run: `pnpm vitest tests/integration/api/replays-route.test.ts tests/integration/api/runs-route.test.ts`
Expected: PASS

Run: `pnpm playwright test tests/e2e/replay.spec.ts tests/e2e/config.spec.ts`
Expected: PASS and both replay submission and config save flows work end-to-end.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/replays src/app/api/runs src/app/(protected)/replay src/app/(protected)/runs src/components/replay src/components/runs tests/integration/api/replays-route.test.ts tests/integration/api/runs-route.test.ts tests/e2e/replay.spec.ts tests/e2e/config.spec.ts
git commit -m "feat: add replay lab run history and config workflows"
```

## Task 12: Wire Scheduler, Verification, and Release Readiness

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Create: `README.md`
- Create: `tests/e2e/full-console.spec.ts`
- Create: `src/app/api/health/route.ts`

- [ ] **Step 1: Write the failing full-console E2E test**

```ts
import { test, expect } from "@playwright/test";

test("login, inspect dashboard, save config, submit replay, and view run history", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("Coin Hub")).toBeVisible();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm playwright test tests/e2e/full-console.spec.ts`
Expected: FAIL until the full app flow and scripts are wired.

- [ ] **Step 3: Add operational scripts and health endpoint**

```json
{
  "scripts": {
    "dev": "next dev",
    "worker": "tsx src/worker/index.ts",
    "scheduler": "tsx src/worker/scheduler.ts",
    "test": "vitest run",
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 4: Document local run flow**

```md
pnpm install
pnpm prisma migrate dev
pnpm tsx prisma/seed.ts
pnpm dev
pnpm worker
pnpm scheduler
```

- [ ] **Step 5: Run the full verification matrix**

Run: `pnpm test`
Expected: PASS

Run: `pnpm test:e2e`
Expected: PASS

Run: `pnpm next build`
Expected: PASS

Run: `pnpm tsx src/worker/index.ts --once`
Expected: PASS and process a pending job cleanly.

- [ ] **Step 6: Commit**

```bash
git add package.json .env.example README.md src/app/api/health/route.ts tests/e2e/full-console.spec.ts
git commit -m "chore: finalize console verification and docs"
```

## Verification Checklist

- `Command Center` simultaneously shows `BTC` and `ETH`.
- `立即分析` submits one dual-asset job.
- `Analysis Workspace` shows candle, structure, tweet, and signal overlays for one asset at a time.
- `Strategy Config` creates a new version instead of mutating the old one.
- `Replay Lab` submits a replay job and shows the resulting summary.
- `Run History` exposes dual-asset results, evidence, and warnings.
- Tweet source failure produces visible degradation in both API results and UI.
- Bad candle data interrupts the affected asset and preserves the healthy asset output.

## Risks to Watch During Execution

- Do not let page components fetch Binance or tweet sources directly.
- Do not let the signal builder depend on UI view models.
- Do not skip the database-backed queue just because local development is easier synchronously.
- Do not hide config edits behind implicit mutation; always version them.
- Do not reduce the dashboard to single-asset mode.

## Plan Review Notes

- This plan intentionally chooses `Next.js + Prisma + SQLite + DB-backed jobs` to keep phase 1 buildable in an empty repository while preserving the later `web + worker` split.
- Because explicit subagent delegation was not requested in this thread, plan review should be performed locally in this session or by the user, rather than spawning a reviewer agent.
