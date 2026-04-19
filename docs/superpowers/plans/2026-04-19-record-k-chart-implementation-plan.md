# Record K Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first-screen record research workspace that pins records to a local K-line chart, computes `good / neutral / bad` outcomes, keeps TradingView as a secondary reference view, and supports review tags plus outcome filtering.

**Architecture:** Keep the app as a `Next.js + Prisma + SQLite` monolith. Add a new `outcomes` domain slice for outcome computation and review tags, a lightweight local research chart built with `lightweight-charts` plus DOM-based record lanes, and a chart-slice API so the client can switch symbol/timeframe without reloading the full page. Preserve the existing TradingView widget as a secondary panel instead of deleting it.

**Tech Stack:** `Next.js 16`, `React 19`, `TypeScript`, `Tailwind CSS`, `Prisma + SQLite`, `lightweight-charts`, `Zod`, `Vitest`, `Testing Library`, `Playwright`

---

## Implementation Assumptions

- The approved spec is [2026-04-19-record-k-chart-design.md](/Users/jiechen/per-pro/coin-hub/docs/superpowers/specs/2026-04-19-record-k-chart-design.md).
- The worktree is dirty today. Preserve unrelated edits in `.env.example`, `package.json`, `src/app/page.tsx`, `src/components/research-desk/record-form.tsx`, `src/components/research-desk/research-desk.tsx`, `scripts/dev.ts`, `src/lib/dev-server-lock.ts`, and `tests/unit/lib/dev-server-lock.test.ts`.
- `lightweight-charts` is already installed and should power the local research chart.
- `TradingView` stays in the product as a secondary reference view, likely rendered through the existing [price-chart.tsx](/Users/jiechen/per-pro/coin-hub/src/components/analysis/price-chart.tsx).
- Prisma does not support polymorphic foreign keys cleanly. Implement the spec’s `subjectType / subjectId` semantics with explicit nullable relations (`recordId`, `planId`) on `RecordOutcome`, then serialize them back into the frontend shape.
- Outcome rules ship as versioned in-code profiles keyed by `recordType + timeframe`. There is no admin UI for rule editing in this iteration.
- `prisma/migrations/*_record_outcomes/migration.sql` is the only generated path pattern in this plan. Prisma will supply the timestamped folder name when `pnpm prisma migrate dev --name record_outcomes` runs.

## Proposed File Structure

### Modify

- `README.md`  
  Responsibility: document the new first-screen research chart and TradingView secondary panel.
- `prisma/schema.prisma`  
  Responsibility: add `RecordOutcome`, `ReviewTag`, and join-table models.
- `src/app/page.tsx`  
  Responsibility: keep loading the default chart slice but promote the new research workspace to the first screen.
- `src/app/globals.css`  
  Responsibility: add any chart-lane and outcome-color tokens required by the new workspace.
- `src/components/analysis/price-chart.tsx`  
  Responsibility: remain the TradingView-powered reference chart and expose copy/layout that matches its new secondary role.
- `src/components/research-desk/research-desk-types.ts`  
  Responsibility: define outcome, tag, aggregate, and chart-slice client types.
- `src/components/research-desk/research-desk-data.ts`  
  Responsibility: load the default chart slice, outcomes, review tags, and aggregates.
- `src/components/research-desk/research-desk.tsx`  
  Responsibility: own symbol/timeframe/filter state, selected outcome state, slice fetching, and first-screen layout.
- `src/components/research-desk/record-detail.tsx`  
  Responsibility: render source record details next to the selected outcome.
- `src/modules/records/record-service.ts`  
  Responsibility: trigger initial outcome sync after record creation.
- `tests/e2e/research-desk.spec.ts`  
  Responsibility: cover the end-to-end record-to-chart-to-tagging flow.

### Create

- `prisma/migrations/*_record_outcomes/migration.sql`  
  Responsibility: create outcome and review-tag tables.
- `src/modules/outcomes/outcome-profile.ts`  
  Responsibility: store versioned window/threshold profiles by `recordType + timeframe`.
- `src/modules/outcomes/outcome-repository.ts`  
  Responsibility: persist outcomes, review tags, and slice queries.
- `src/modules/outcomes/outcome-service.ts`  
  Responsibility: align records to candles, compute outcome metrics, upsert `pending / good / neutral / bad`, and aggregate counts.
- `src/modules/outcomes/review-tag-catalog.ts`  
  Responsibility: expose the default review tag library.
- `src/app/api/research-desk/chart/route.ts`  
  Responsibility: return candles, outcomes, review tags, and aggregate counts for one `symbol + timeframe` slice.
- `src/app/api/record-outcomes/[outcomeId]/route.ts`  
  Responsibility: patch review tags on one outcome and return the refreshed payload.
- `src/components/research-desk/research-chart.tsx`  
  Responsibility: render the local price chart plus DOM-based outcome lanes on a shared time axis.
- `src/components/research-desk/research-chart-toolbar.tsx`  
  Responsibility: render symbol/timeframe/result/tag controls.
- `src/components/research-desk/research-chart-utils.ts`  
  Responsibility: map candles/outcomes into chart series data and clickable lane rows.
- `src/components/research-desk/outcome-detail.tsx`  
  Responsibility: show the selected outcome’s result reason, metrics, and window metadata.
- `src/components/research-desk/outcome-summary-panel.tsx`  
  Responsibility: show counts, tag heat, and filtered outcome stats.
- `src/components/research-desk/review-tag-editor.tsx`  
  Responsibility: render preset tags plus custom-tag entry and save flow.
- `tests/unit/modules/outcomes/outcome-service.test.ts`  
  Responsibility: verify alignment, profile selection, and label generation.
- `tests/integration/modules/outcomes/outcome-repository.test.ts`  
  Responsibility: verify outcome persistence and review-tag replacement.
- `tests/integration/api/research-desk-chart-route.test.ts`  
  Responsibility: verify slice loading for symbol/timeframe switches.
- `tests/integration/api/record-outcomes-route.test.ts`  
  Responsibility: verify review-tag patching.
- `tests/unit/components/research-desk/research-chart.test.tsx`  
  Responsibility: verify the local chart renders lanes and selection state.
- `tests/unit/components/research-desk/review-tag-editor.test.tsx`  
  Responsibility: verify preset + custom tag editing UX.
- `tests/unit/components/research-desk/research-desk.test.tsx`  
  Responsibility: verify the first-screen layout, filtering, and TradingView secondary panel.

## Task 1: Add Outcome and Review-Tag Persistence

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/*_record_outcomes/migration.sql`
- Create: `src/modules/outcomes/outcome-repository.ts`
- Create: `src/modules/outcomes/review-tag-catalog.ts`
- Modify: `src/components/research-desk/research-desk-types.ts`
- Create: `tests/integration/modules/outcomes/outcome-repository.test.ts`

- [ ] **Step 1: Write the failing repository integration test**

```ts
import { db } from "@/lib/db";
import { outcomeRepository } from "@/modules/outcomes/outcome-repository";

it("stores one outcome with preset and custom review tags", async () => {
  const trader = await db.traderProfile.create({ data: { name: "Trader A" } });
  const record = await db.traderRecord.create({
    data: {
      traderId: trader.id,
      symbol: "BTC",
      recordType: "trade",
      sourceType: "manual",
      occurredAt: new Date("2026-04-19T09:00:00.000Z"),
      rawContent: "BTC 回踩支撑后二次突破",
    },
  });

  const outcome = await outcomeRepository.upsertRecordOutcome({
    recordId: record.id,
    symbol: "BTC",
    timeframe: "1h",
    windowType: "trade-follow-through",
    windowStartAt: new Date("2026-04-19T09:00:00.000Z"),
    windowEndAt: new Date("2026-04-20T09:00:00.000Z"),
    resultLabel: "good",
    resultReason: "先命中顺向阈值",
    forwardReturnPercent: 3.2,
    maxFavorableExcursionPercent: 5.4,
    maxAdverseExcursionPercent: -1.1,
    ruleVersion: "v1",
  });

  await outcomeRepository.replaceReviewTags(outcome.id, ["趋势跟随", "自定义: 新闻催化"]);

  const saved = await outcomeRepository.listSliceOutcomes({
    symbol: "BTC",
    timeframe: "1h",
  });

  expect(saved[0]?.reviewTags).toEqual(["趋势跟随", "自定义: 新闻催化"]);
});
```

- [ ] **Step 2: Run the integration test to verify it fails**

Run: `pnpm vitest run tests/integration/modules/outcomes/outcome-repository.test.ts`
Expected: FAIL because the Prisma schema and repository do not exist yet.

- [ ] **Step 3: Add Prisma models and repository helpers**

```prisma
model RecordOutcome {
  id                           String   @id @default(cuid())
  recordId                     String?
  planId                       String?  @unique
  symbol                       String
  timeframe                    String
  windowType                   String
  windowStartAt                DateTime
  windowEndAt                  DateTime
  resultLabel                  String
  resultReason                 String
  forwardReturnPercent         Float?
  maxFavorableExcursionPercent Float?
  maxAdverseExcursionPercent   Float?
  ruleVersion                  String
  computedAt                   DateTime @default(now())
  record                       TraderRecord?   @relation(fields: [recordId], references: [id], onDelete: Cascade)
  plan                         ExecutionPlan?  @relation(fields: [planId], references: [id], onDelete: Cascade)
  reviewTags                   RecordOutcomeReviewTag[]

  @@index([symbol, timeframe, resultLabel])
}

model ReviewTag {
  id        String                  @id @default(cuid())
  label     String                  @unique
  kind      String
  links     RecordOutcomeReviewTag[]
}

model RecordOutcomeReviewTag {
  outcomeId String
  tagId     String
  outcome   RecordOutcome @relation(fields: [outcomeId], references: [id], onDelete: Cascade)
  tag       ReviewTag     @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([outcomeId, tagId])
}
```

```ts
export const DEFAULT_REVIEW_TAGS = [
  "趋势跟随",
  "突破追随",
  "区间反转",
  "止损纪律差",
];
```

- [ ] **Step 4: Generate the migration and rerun the repository test**

Run: `pnpm prisma migrate dev --name record_outcomes`
Expected: Prisma creates `prisma/migrations/*_record_outcomes/migration.sql` and regenerates the client.

Run: `pnpm vitest run tests/integration/modules/outcomes/outcome-repository.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/modules/outcomes src/components/research-desk/research-desk-types.ts tests/integration/modules/outcomes/outcome-repository.test.ts
git commit -m "feat(outcomes): 建 outcome 与复盘标签模型"
```

## Task 2: Build the Outcome Evaluation Engine

**Files:**
- Create: `src/modules/outcomes/outcome-profile.ts`
- Create: `src/modules/outcomes/outcome-service.ts`
- Modify: `src/modules/records/record-service.ts`
- Create: `tests/unit/modules/outcomes/outcome-service.test.ts`
- Modify: `src/modules/market-data/candle-repository.ts`

- [ ] **Step 1: Write the failing outcome-service unit tests**

```ts
import { syncRecordOutcomes } from "@/modules/outcomes/outcome-service";

it("marks a long trade record as good when favorable excursion wins first", async () => {
  const result = await syncRecordOutcomes({
    record: {
      id: "record-1",
      recordType: "trade",
      symbol: "BTC",
      occurredAt: new Date("2026-04-19T00:00:00.000Z"),
      executionPlans: [{ id: "plan-1", side: "long", triggerText: "breakout", entryText: "follow through" }],
    },
    timeframe: "1h",
    candles: [
      { openTime: new Date("2026-04-19T00:00:00.000Z"), open: 100, high: 103, low: 99, close: 102, volume: 1 },
      { openTime: new Date("2026-04-19T01:00:00.000Z"), open: 102, high: 107, low: 101, close: 106, volume: 1 },
    ],
  });

  expect(result[0]).toMatchObject({
    resultLabel: "good",
    resultReason: expect.stringContaining("顺向"),
  });
});

it("returns pending when the candle window is incomplete", async () => {
  const result = await syncRecordOutcomes({
    record: {
      id: "record-2",
      recordType: "trade",
      symbol: "BTC",
      occurredAt: new Date("2026-04-19T00:00:00.000Z"),
      executionPlans: [{ id: "plan-2", side: "short", triggerText: "reversal", entryText: "fade" }],
    },
    timeframe: "4h",
    candles: [],
  });

  expect(result[0]?.resultLabel).toBe("pending");
});

it("creates one outcome per view plan", async () => {
  const result = await syncRecordOutcomes({
    record: {
      id: "record-3",
      recordType: "view",
      symbol: "ETH",
      occurredAt: new Date("2026-04-19T00:00:00.000Z"),
      executionPlans: [
        { id: "plan-a", side: "long", triggerText: "breakout", entryText: "follow" },
        { id: "plan-b", side: "short", triggerText: "failed breakout", entryText: "fade" },
      ],
    },
    timeframe: "1h",
    candles: [],
  });

  expect(result).toHaveLength(2);
});
```

- [ ] **Step 2: Run the unit tests to verify they fail**

Run: `pnpm vitest run tests/unit/modules/outcomes/outcome-service.test.ts`
Expected: FAIL because there is no outcome engine yet.

- [ ] **Step 3: Implement profile selection, candle alignment, and outcome upsert**

```ts
export const OUTCOME_PROFILE_MAP = {
  trade: {
    "15m": { windowCandles: 32, favorablePct: 1.2, adversePct: -0.7 },
    "1h": { windowCandles: 24, favorablePct: 2.4, adversePct: -1.4 },
    "4h": { windowCandles: 18, favorablePct: 4.8, adversePct: -2.6 },
    "1d": { windowCandles: 10, favorablePct: 7.5, adversePct: -4.2 },
  },
  view: {
    "15m": { windowCandles: 24, favorablePct: 1.0, adversePct: -0.8 },
    "1h": { windowCandles: 20, favorablePct: 2.0, adversePct: -1.6 },
    "4h": { windowCandles: 16, favorablePct: 4.0, adversePct: -3.0 },
    "1d": { windowCandles: 8, favorablePct: 6.5, adversePct: -4.5 },
  },
} as const;

function pickOutcomeLabel(metrics: {
  forwardReturnPercent: number | null;
  mfePercent: number | null;
  maePercent: number | null;
  favorablePct: number;
  adversePct: number;
}) {
  if (metrics.mfePercent === null || metrics.maePercent === null) return "pending";
  if (metrics.mfePercent >= metrics.favorablePct && metrics.maePercent > metrics.adversePct) return "good";
  if (metrics.maePercent <= metrics.adversePct) return "bad";
  return "neutral";
}
```

```ts
export async function syncOutcomesForRecordId(recordId: string, timeframe: ResearchDeskTimeframe = "1h") {
  const record = await outcomeRepository.getRecordForSync(recordId);
  if (!record) return [];

  const candles = await candleRepository.listCandles({
    symbol: record.symbol,
    timeframe,
    limit: 600,
  });

  const computed = computeRecordOutcomes({ record, timeframe, candles });
  return outcomeRepository.replaceComputedOutcomes(record.id, computed);
}
```

- [ ] **Step 4: Wire record creation into outcome sync and rerun tests**

Run: `pnpm vitest run tests/unit/modules/outcomes/outcome-service.test.ts`
Expected: PASS

Run: `pnpm vitest run tests/integration/modules/records/record-service.test.ts`
Expected: PASS after `createRecordFromInput` triggers initial outcome generation or `pending` upsert.

- [ ] **Step 5: Commit**

```bash
git add src/modules/outcomes src/modules/records/record-service.ts src/modules/market-data/candle-repository.ts tests/unit/modules/outcomes/outcome-service.test.ts tests/integration/modules/records/record-service.test.ts
git commit -m "feat(outcomes): 增 outcome 计算与同步链路"
```

## Task 3: Expose Chart Slices and Outcome Tag Updates Through APIs

**Files:**
- Create: `src/app/api/research-desk/chart/route.ts`
- Create: `src/app/api/record-outcomes/[outcomeId]/route.ts`
- Modify: `src/components/research-desk/research-desk-data.ts`
- Modify: `src/components/research-desk/research-desk-types.ts`
- Create: `tests/integration/api/research-desk-chart-route.test.ts`
- Create: `tests/integration/api/record-outcomes-route.test.ts`

- [ ] **Step 1: Write the failing API integration tests**

```ts
import { GET as getChart } from "@/app/api/research-desk/chart/route";
import { PATCH as patchOutcome } from "@/app/api/record-outcomes/[outcomeId]/route";

it("returns one chart slice with candles, outcomes, and aggregates", async () => {
  const response = await getChart(
    new Request("http://localhost:3000/api/research-desk/chart?symbol=BTC&timeframe=1h"),
  );
  const payload = await response.json();

  expect(payload.selection).toEqual({ symbol: "BTC", timeframe: "1h" });
  expect(Array.isArray(payload.chart.candles)).toBe(true);
  expect(Array.isArray(payload.chart.outcomes)).toBe(true);
  expect(payload.summary.counts).toEqual(
    expect.objectContaining({ good: expect.any(Number), neutral: expect.any(Number), bad: expect.any(Number) }),
  );
});

it("replaces review tags on one outcome", async () => {
  const response = await patchOutcome(
    new Request("http://localhost:3000/api/record-outcomes/outcome-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reviewTags: ["趋势跟随", "自定义: 新闻催化"] }),
    }),
    { params: Promise.resolve({ outcomeId: "outcome-1" }) },
  );

  expect(response.status).toBe(200);
});
```

- [ ] **Step 2: Run the API tests to verify they fail**

Run: `pnpm vitest run tests/integration/api/research-desk-chart-route.test.ts tests/integration/api/record-outcomes-route.test.ts`
Expected: FAIL because the routes and payload serializers do not exist yet.

- [ ] **Step 3: Implement slice loading and outcome-tag patching**

```ts
// src/app/api/research-desk/chart/route.ts
export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = parseSymbol(url.searchParams.get("symbol"));
  const timeframe = parseTimeframe(url.searchParams.get("timeframe"));

  return NextResponse.json(
    await loadResearchDeskPayload({
      symbol,
      timeframe,
    }),
  );
}
```

```ts
// src/app/api/record-outcomes/[outcomeId]/route.ts
export async function PATCH(
  request: Request,
  context: { params: Promise<{ outcomeId: string }> },
) {
  const { outcomeId } = await context.params;
  const body = reviewTagPatchSchema.parse(await request.json());
  const outcome = await outcomeRepository.replaceReviewTags(outcomeId, body.reviewTags);
  return NextResponse.json({ outcome });
}
```

- [ ] **Step 4: Extend the server payload shape and rerun the API tests**

Run: `pnpm vitest run tests/integration/api/research-desk-chart-route.test.ts tests/integration/api/record-outcomes-route.test.ts`
Expected: PASS

Run: `pnpm vitest run tests/unit/research-desk-home.test.tsx`
Expected: PASS after the root page still renders with the richer payload shape.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/research-desk/chart/route.ts src/app/api/record-outcomes/[outcomeId]/route.ts src/components/research-desk/research-desk-data.ts src/components/research-desk/research-desk-types.ts tests/integration/api/research-desk-chart-route.test.ts tests/integration/api/record-outcomes-route.test.ts
git commit -m "feat(api): 暴露图表切片与 outcome 更新接口"
```

## Task 4: Build the Local Research Chart and Keep TradingView as Reference

**Files:**
- Create: `src/components/research-desk/research-chart.tsx`
- Create: `src/components/research-desk/research-chart-toolbar.tsx`
- Create: `src/components/research-desk/research-chart-utils.ts`
- Modify: `src/components/analysis/price-chart.tsx`
- Modify: `src/app/globals.css`
- Create: `tests/unit/components/research-desk/research-chart.test.tsx`
- Modify: `tests/unit/components/analysis/price-chart.test.ts`

- [ ] **Step 1: Write the failing chart component tests**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResearchChart } from "@/components/research-desk/research-chart";

it("renders local outcome lanes and notifies on selection", async () => {
  const user = userEvent.setup();
  const onSelectOutcome = vi.fn();

  render(
    <ResearchChart
      candles={[
        { openTime: "2026-04-19T00:00:00.000Z", open: 100, high: 103, low: 99, close: 102, volume: 1 },
      ]}
      outcomes={[
        {
          id: "outcome-1",
          resultLabel: "good",
          previewLabel: "view plan A",
          occurredAt: "2026-04-19T00:00:00.000Z",
          reviewTags: ["趋势跟随"],
        },
      ]}
      selectedOutcomeId="outcome-1"
      onSelectOutcome={onSelectOutcome}
    />,
  );

  expect(screen.getByRole("button", { name: /view plan a/i })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /view plan a/i }));
  expect(onSelectOutcome).toHaveBeenCalledWith("outcome-1");
});

it("keeps TradingView as a secondary reference view", () => {
  render(<PriceChart symbol="BTC" timeframe="1h" title="TradingView 参考视图" />);
  expect(screen.getByText("TradingView 参考视图")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the component tests to verify they fail**

Run: `pnpm vitest run tests/unit/components/research-desk/research-chart.test.tsx tests/unit/components/analysis/price-chart.test.ts`
Expected: FAIL because the local research chart does not exist yet.

- [ ] **Step 3: Implement the local chart with DOM-based outcome lanes**

```tsx
export function ResearchChart({
  candles,
  outcomes,
  selectedOutcomeId,
  onSelectOutcome,
}: ResearchChartProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const chart = createChart(hostRef.current!, {
      layout: { background: { color: "transparent" }, textColor: "var(--chart-text)" },
      grid: { vertLines: { color: "var(--chart-grid)" }, horzLines: { color: "var(--chart-grid)" } },
    });
    const series = chart.addCandlestickSeries();
    series.setData(toCandleSeries(candles));
    return () => chart.remove();
  }, [candles]);

  return (
    <section className="grid gap-3">
      <div ref={hostRef} className="h-[320px] rounded-md border border-border/80 bg-card" />
      <div className="grid gap-2">
        {buildOutcomeLaneRows(outcomes).map((lane) => (
          <button key={lane.id} type="button" onClick={() => onSelectOutcome(lane.id)}>
            {lane.previewLabel}
          </button>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Reword the TradingView panel as a reference view and rerun tests**

Run: `pnpm vitest run tests/unit/components/research-desk/research-chart.test.tsx tests/unit/components/analysis/price-chart.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/research-desk/research-chart.tsx src/components/research-desk/research-chart-toolbar.tsx src/components/research-desk/research-chart-utils.ts src/components/analysis/price-chart.tsx src/app/globals.css tests/unit/components/research-desk/research-chart.test.tsx tests/unit/components/analysis/price-chart.test.ts
git commit -m "feat(chart): 增首屏研究图并保留 TV 参考图"
```

## Task 5: Rebuild the First-Screen Research Desk Around Outcomes

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/research-desk/research-desk.tsx`
- Modify: `src/components/research-desk/record-detail.tsx`
- Create: `src/components/research-desk/outcome-detail.tsx`
- Create: `src/components/research-desk/outcome-summary-panel.tsx`
- Create: `src/components/research-desk/review-tag-editor.tsx`
- Create: `tests/unit/components/research-desk/research-desk.test.tsx`
- Create: `tests/unit/components/research-desk/review-tag-editor.test.tsx`

- [ ] **Step 1: Write the failing workspace component tests**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResearchDesk } from "@/components/research-desk/research-desk";

it("shows the record K chart workspace before the secondary panels", () => {
  render(<ResearchDesk initialData={buildResearchDeskFixture()} />);

  expect(screen.getByRole("heading", { name: "记录 K 线图工作台" })).toBeInTheDocument();
  expect(screen.getByText("TradingView 参考视图")).toBeInTheDocument();
});

it("filters outcomes by result label", async () => {
  const user = userEvent.setup();
  render(<ResearchDesk initialData={buildResearchDeskFixture()} />);

  await user.click(screen.getByRole("button", { name: "bad" }));
  expect(screen.getByText("1 条 bad 结果")).toBeInTheDocument();
});

it("adds preset and custom review tags", async () => {
  const user = userEvent.setup();
  render(<ReviewTagEditor value={["趋势跟随"]} presetTags={["趋势跟随", "突破追随"]} onSave={vi.fn()} />);

  await user.click(screen.getByRole("button", { name: "突破追随" }));
  await user.type(screen.getByLabelText("自定义标签"), "新闻催化");
  await user.click(screen.getByRole("button", { name: "保存标签" }));
});
```

- [ ] **Step 2: Run the workspace tests to verify they fail**

Run: `pnpm vitest run tests/unit/components/research-desk/research-desk.test.tsx tests/unit/components/research-desk/review-tag-editor.test.tsx`
Expected: FAIL because the first-screen workspace, filtering UI, and tag editor do not exist yet.

- [ ] **Step 3: Rebuild the page layout around the local chart and selected outcome**

```tsx
export function ResearchDesk({ initialData }: ResearchDeskProps) {
  const [selection, setSelection] = useState(initialData.selection);
  const [selectedOutcomeId, setSelectedOutcomeId] = useState(initialData.selectedOutcomeId);
  const [resultFilter, setResultFilter] = useState<"all" | "good" | "neutral" | "bad">("all");

  return (
    <section className="grid gap-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Coin Hub</p>
        <h1 className="text-3xl font-semibold text-foreground">记录 K 线图工作台</h1>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <div className="grid gap-4">
          <ResearchChartToolbar selection={selection} resultFilter={resultFilter} onSelectionChange={setSelection} onResultFilterChange={setResultFilter} />
          <ResearchChart {...sliceProps} selectedOutcomeId={selectedOutcomeId} onSelectOutcome={setSelectedOutcomeId} />
          <PriceChart symbol={selection.symbol} timeframe={selection.timeframe} title="TradingView 参考视图" />
        </div>

        <div className="grid gap-4">
          <OutcomeSummaryPanel summary={slice.summary} />
          <RecordDetail record={selectedRecord} />
          <OutcomeDetail outcome={selectedOutcome} />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Wire tag saving into the outcome patch route and rerun tests**

Run: `pnpm vitest run tests/unit/components/research-desk/research-desk.test.tsx tests/unit/components/research-desk/review-tag-editor.test.tsx tests/unit/research-desk-home.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/components/research-desk/research-desk.tsx src/components/research-desk/record-detail.tsx src/components/research-desk/outcome-detail.tsx src/components/research-desk/outcome-summary-panel.tsx src/components/research-desk/review-tag-editor.tsx tests/unit/components/research-desk/research-desk.test.tsx tests/unit/components/research-desk/review-tag-editor.test.tsx tests/unit/research-desk-home.test.tsx
git commit -m "feat(research-desk): 重排首屏并接 outcome 详情"
```

## Task 6: Finish Verification, E2E, and Docs

**Files:**
- Modify: `tests/e2e/research-desk.spec.ts`
- Modify: `README.md`

- [ ] **Step 1: Expand the E2E scenario to cover the new chart workflow**

```ts
test("creates a record, sees it on the local chart, and tags the outcome", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "新建记录" }).click();
  await page.getByLabel("原始记录").fill("BTC 回踩支撑后二次突破");
  await page.getByRole("button", { name: "保存记录" }).click();

  await expect(page.getByRole("heading", { name: "记录 K 线图工作台" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Trader/i })).toBeVisible();

  await page.getByRole("button", { name: "趋势跟随" }).click();
  await page.getByRole("button", { name: "保存标签" }).click();
  await expect(page.getByText("趋势跟随")).toBeVisible();
});
```

- [ ] **Step 2: Run the E2E test to verify it fails before the final glue lands**

Run: `pnpm test:e2e --grep "creates a record, sees it on the local chart, and tags the outcome"`
Expected: FAIL or expose the remaining selector/save gaps before final verification.

- [ ] **Step 3: Update the README for the new first-screen workflow**

```md
- 首屏优先显示记录 K 线图工作台
- TradingView 图表保留为次级参考视图
- 可以按 good / neutral / bad 与复盘标签回看结果
```

- [ ] **Step 4: Run full verification with @verification-before-completion**

Run: `pnpm test`
Expected: PASS

Run: `pnpm build`
Expected: PASS

Run: `pnpm test:e2e`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add README.md tests/e2e/research-desk.spec.ts
git commit -m "test(research-desk): 验证记录图与复盘链路"
```

## Final Verification Checklist

- [ ] Local research chart is the first-screen primary view.
- [ ] TradingView still renders as a secondary reference panel.
- [ ] `trade` and `view` both produce outcomes for the active timeframe.
- [ ] `pending` is treated as a technical state, not a fourth evaluation label.
- [ ] Review tags support both preset and custom values.
- [ ] Slice switching (`BTC / ETH`, timeframe) refetches candles and outcomes together.
- [ ] README and tests reflect the new workflow.
