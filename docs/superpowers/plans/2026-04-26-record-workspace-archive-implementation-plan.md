# Record Workspace Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the research desk first screen around active records, manual record lifecycle states, top record selection, and an archive analysis tab with TradingView reference.

**Architecture:** Keep the app as a `Next.js + React + Prisma + SQLite` monolith. Add status/archive fields and record lifecycle helpers first, then expose status-aware APIs and archive payload loading, then refactor the client into a left sidebar plus top-tab workspace while reusing existing chart, record detail, record form, and strategy candidate components.

**Tech Stack:** `Next.js 16`, `React 19`, `TypeScript`, `Tailwind CSS`, `Prisma + SQLite`, `Zod`, `Radix UI`, `lucide-react`, `Vitest`, `Testing Library`, `Playwright`

---

## Execution Status

- Status: implemented and verified in the current workspace.
- Verification:
  - `pnpm test` -> 31 files passed, 123 tests passed.
  - `pnpm build` -> Next production build completed successfully.
  - Browser smoke on `http://localhost:58634/` -> first-screen sidebar/tabs, all-records tab, and archive-analysis empty state rendered.
- Notes:
  - Default `pnpm dev` targets `daily`; local smoke uses `pnpm dev:local` because daily Turso env vars are not set locally.
  - TradingView external embed emitted one console error from `https://s3.tradingview.com/...`; the app still rendered the TradingView reference region and link.

---

## References

- Spec: `docs/superpowers/specs/2026-04-26-record-workspace-archive-design.md`
- Current root component: `src/components/research-desk/research-desk.tsx`
- Current first screen: `src/components/research-desk/research-desk-first-screen.tsx`
- Current secondary workspace: `src/components/research-desk/research-desk-secondary-workspace.tsx`
- Current record API: `src/app/api/trader-records/route.ts`, `src/app/api/trader-records/[recordId]/route.ts`

## Baseline Reconcile

This plan was written immediately before implementation and the first data/API slice has already started in the current working tree. Treat the following as existing draft work to review and complete, not as absent files:

- `src/modules/records/record-status.ts`
- `prisma/migrations/20260426120000_record_workspace_status/migration.sql`
- `src/components/research-desk/archive-analysis-data.ts`
- `src/app/api/research-desk/archive/route.ts`
- `status`, `archiveSummary`, `archivedAt`, `completion`, and archive payload types

Execution order is adjusted accordingly:

1. Reconcile and verify existing data/API draft files.
2. Complete loader and archive state wiring before shell tests depend on archive selector behavior.
3. Build panels and UI on top of the stable API contract.

## Proposed File Structure

### Modify

- `prisma/schema.prisma`
  Add `TraderRecord.status` and `TraderRecord.archiveSummary`.
- `src/lib/research-desk-schema-bootstrap.ts`
  Add cloud SQLite bootstrap columns and status backfill.
- `src/modules/records/record-schema.ts`
  Add action payload validation for status and archive summary through route-local schemas or shared schema helpers.
- `src/modules/records/record-repository.ts`
  Add list filters, status transition updates, archive summary update, archive idempotency, and status backfill helpers.
- `src/modules/records/record-service.ts`
  Expose status, archive, archive summary, and filtered list service functions.
- `src/modules/records/record-serializer.ts`
  Serialize status, archivedAt, archiveSummary, and completion.
- `src/components/research-desk/research-desk-types.ts`
  Add record status, completion, archive payload, and archive stats types.
- `src/components/research-desk/research-desk-data.ts`
  Load status-aware active records and initial selected record by priority.
- `src/components/research-desk/research-desk.tsx`
  Own workspace tab state, active/archive record sets, status actions, archive loading, and selection synchronization.
- `src/components/research-desk/record-list.tsx`
  Render status badges and remove status mutation actions from list cards.
- `src/components/research-desk/record-detail.tsx`
  Show lifecycle state, completion hints, status action hook, and archive summary when applicable.
- `tests/unit/components/research-desk/research-desk.test.tsx`
  Cover shell tabs, record dropdown behavior, status actions, archive moves, and archive empty state.
- `tests/integration/api/research-desk-chart-route.test.ts`
  Keep existing chart behavior safe after status filtering.
- `tests/integration/modules/records/record-service.test.ts`
  Cover lifecycle status and archive summary service behavior.

### Create

- `prisma/migrations/20260426120000_record_workspace_status/migration.sql`
  Add `status`, `archiveSummary`, and backfill records.
- `src/modules/records/record-status.ts`
  Define status labels, transition matrix, backfill derivation, selection priority, and completion helper.
- `src/components/research-desk/research-desk-workspace-shell.tsx`
  Layout: left public sidebar + right tabs.
- `src/components/research-desk/research-desk-sidebar.tsx`
  New record button, top record selector, status counts, selected record summary, completion hints, result summary.
- `src/components/research-desk/research-desk-main-tabs.tsx`
  Right-side top tabs and panels.
- `src/components/research-desk/active-records-panel.tsx`
  First-screen running records board and selected record detail/chart section.
- `src/components/research-desk/all-records-panel.tsx`
  Status-aware list panel for non-archived records.
- `src/components/research-desk/archive-analysis-panel.tsx`
  Archived records search/list, archive stats, TradingView reference, summary editor, outcome/tag aggregate.
- `src/components/research-desk/archive-summary-editor.tsx`
  Small textarea + save action for archived record summary.
- `src/components/research-desk/archive-analysis-data.ts`
  Server loader for `GET /api/research-desk/archive`.
- `src/app/api/research-desk/archive/route.ts`
  Archive analysis payload route.
- `tests/unit/modules/records/record-status.test.ts`
  Unit tests for status transitions, selection priority, completion, legacy derivation.
- `tests/integration/api/trader-records-route.test.ts`
  API tests for status filtering, transitions, archive idempotency, archive summary.
- `tests/integration/api/research-desk-archive-route.test.ts`
  API tests for archive payload, search, recordId fallback, selection override.

## Task 1: Reconcile Record Status and Completion Domain

**Files:**
- Modify: `src/modules/records/record-status.ts`
- Test: `tests/unit/modules/records/record-status.test.ts`
- Modify: `src/components/research-desk/research-desk-types.ts`

- [ ] **Step 1: Write failing status helper tests**

Cover:

- `getAllowedRecordStatusAction("not_started")` returns `start`.
- `applyRecordStatusTransition("in_progress", "ended")` succeeds.
- `applyRecordStatusTransition("not_started", "ended")` throws a conflict error.
- legacy status derivation returns `archived` when `archivedAt` exists, `ended` when samples or completed outcomes exist, `in_progress` for pending-only outcomes, and `not_started` otherwise.
- selection priority prefers latest `in_progress`, then latest `not_started`, then latest `ended`.
- completion marks missing basics/plans/review separately.

Run: `pnpm vitest run tests/unit/modules/records/record-status.test.ts`
Expected: FAIL until tests match and complete the existing draft helper.

- [ ] **Step 2: Implement `record-status.ts`**

Define:

```ts
export type RecordStatus = "not_started" | "in_progress" | "ended" | "archived";
export type RecordStatusAction = "start" | "end" | "archive";
export const RECORD_STATUS_LABELS = {
  not_started: "尚未开始",
  in_progress: "进行中",
  ended: "已结束",
  archived: "已归档",
} satisfies Record<RecordStatus, string>;
```

Implement transition matrix:

- `not_started -> in_progress`
- `in_progress -> ended`
- `ended -> archived`
- repeated same-state update is a no-op
- `archive` is the only way to write archived

Implement `buildRecordCompletion(record)` using required basics, plan fields, sample/outcome/review tag/archive summary signals.

- [ ] **Step 3: Update frontend shared types**

Add `ResearchDeskRecordStatus`, `ResearchDeskRecordCompletion`, `ResearchDeskArchivePayload`, and `ResearchDeskArchiveStats` in `research-desk-types.ts`.

- [ ] **Step 4: Run helper tests**

Run: `pnpm vitest run tests/unit/modules/records/record-status.test.ts`
Expected: PASS.

## Task 2: Reconcile Database Fields, Backfill, and Serialization

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/migrations/20260426120000_record_workspace_status/migration.sql`
- Modify: `src/lib/research-desk-schema-bootstrap.ts`
- Modify: `src/modules/records/record-serializer.ts`
- Test: `tests/integration/modules/records/record-service.test.ts`

- [ ] **Step 1: Write failing serialization/service tests**

Add tests for:

- new records serialize as `not_started`.
- archived legacy rows serialize as `archived`.
- rows with completed samples/outcomes derive `ended` when status is missing.
- `archiveSummary` is serialized separately from `notes`.

Run: `pnpm vitest run tests/integration/modules/records/record-service.test.ts`
Expected: FAIL until serializer/backfill behavior is fully wired.

- [ ] **Step 2: Add Prisma fields and migration**

In `TraderRecord`:

```prisma
status         String   @default("not_started")
archiveSummary String?
```

Migration SQL:

```sql
ALTER TABLE "TraderRecord" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'not_started';
ALTER TABLE "TraderRecord" ADD COLUMN "archiveSummary" TEXT;

UPDATE "TraderRecord"
SET "status" = 'archived'
WHERE "archivedAt" IS NOT NULL;

UPDATE "TraderRecord"
SET "status" = 'ended'
WHERE "archivedAt" IS NULL
  AND "id" IN (
    SELECT DISTINCT ep."recordId"
    FROM "ExecutionPlan" ep
    INNER JOIN "TradeSample" ts ON ts."planId" = ep."id"
  );

UPDATE "TraderRecord"
SET "status" = 'ended'
WHERE "archivedAt" IS NULL
  AND "status" = 'not_started'
  AND "id" IN (
    SELECT DISTINCT ro."recordId"
    FROM "RecordOutcome" ro
    WHERE ro."recordId" IS NOT NULL
      AND ro."resultLabel" IN ('good', 'neutral', 'bad')
    UNION
    SELECT DISTINCT ep."recordId"
    FROM "RecordOutcome" ro
    INNER JOIN "ExecutionPlan" ep ON ep."id" = ro."planId"
    WHERE ro."planId" IS NOT NULL
      AND ro."resultLabel" IN ('good', 'neutral', 'bad')
  );

UPDATE "TraderRecord"
SET "status" = 'in_progress'
WHERE "archivedAt" IS NULL
  AND "status" = 'not_started'
  AND "id" IN (
    SELECT DISTINCT ro."recordId"
    FROM "RecordOutcome" ro
    WHERE ro."recordId" IS NOT NULL
      AND ro."resultLabel" = 'pending'
    UNION
    SELECT DISTINCT ep."recordId"
    FROM "RecordOutcome" ro
    INNER JOIN "ExecutionPlan" ep ON ep."id" = ro."planId"
    WHERE ro."planId" IS NOT NULL
      AND ro."resultLabel" = 'pending'
  );
```

- [ ] **Step 3: Update cloud schema bootstrap**

Add missing-column detection for `status` and `archiveSummary`, plus the same backfill SQL in `buildResearchDeskSchemaStatements`.

- [ ] **Step 4: Update serializer**

Return `status`, `archivedAt`, `archiveSummary`, and `completion`.

- [ ] **Step 5: Run migration and tests**

Run: `pnpm prisma generate`
Run: `pnpm vitest run tests/integration/modules/records/record-service.test.ts`
Expected: PASS.

## Task 3: Implement Status-Aware Record APIs

**Files:**
- Modify: `src/modules/records/record-repository.ts`
- Modify: `src/modules/records/record-service.ts`
- Modify: `src/app/api/trader-records/route.ts`
- Modify: `src/app/api/trader-records/[recordId]/route.ts`
- Test: `tests/integration/api/trader-records-route.test.ts`

- [ ] **Step 1: Write failing API tests**

Cover:

- `GET /api/trader-records?status=archived` returns explicit archived plus legacy `archivedAt` rows.
- default `GET /api/trader-records` excludes archived rows.
- `PATCH action=set-status` allows `not_started -> in_progress -> ended`.
- invalid transition returns `409`.
- `action=archive` only works from `ended`, is idempotent, and preserves original `archivedAt`.
- `update-archive-summary` only works for archived records and does not update `notes`.

Run: `pnpm vitest run tests/integration/api/trader-records-route.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implement repository/service functions**

Add:

- `listTraderRecords({ status, symbol, traderId })`
- `setTraderRecordStatus(recordId, status)`
- `archiveTraderRecord(recordId)` with idempotency and `ended` precondition
- `updateArchiveSummary(recordId, archiveSummary)`

- [ ] **Step 3: Update routes**

`GET /api/trader-records` parses query params.
`PATCH /api/trader-records/[recordId]` recognizes `set-status`, `archive`, and `update-archive-summary`.

- [ ] **Step 4: Run API tests**

Run: `pnpm vitest run tests/integration/api/trader-records-route.test.ts`
Expected: PASS.

## Task 4: Implement Archive Analysis Payload

**Files:**
- Create: `src/components/research-desk/archive-analysis-data.ts`
- Create: `src/app/api/research-desk/archive/route.ts`
- Modify: `src/modules/outcomes/outcome-repository.ts`
- Test: `tests/integration/api/research-desk-archive-route.test.ts`

- [ ] **Step 1: Write failing archive route tests**

Cover:

- route returns archived records, archive stats, candles, outcomes, review tag options, and selected record.
- `recordId` hit overrides response `selection`.
- invalid `recordId` falls back to latest archived record.
- `q` search affects records, selected fallback, aggregate counts, and `chart.outcomes`.
- empty archive returns empty records and `selectedRecordId: null`.

Run: `pnpm vitest run tests/integration/api/research-desk-archive-route.test.ts`
Expected: FAIL.

- [ ] **Step 2: Add outcome query support**

Add `listArchiveOutcomes({ recordIds, symbol, timeframe })`, returning outcomes for record subjects and plan subjects that belong to filtered archived records.

- [ ] **Step 3: Build `loadResearchDeskArchivePayload`**

Use final selection rules from the spec. Reuse candle loading and outcome aggregate helpers where practical; if existing helpers are file-local, extract them safely or duplicate tiny pure helpers until a later cleanup.

- [ ] **Step 4: Add route**

`GET /api/research-desk/archive` parses `symbol`, `timeframe`, `recordId`, `traderId`, `reviewTag`, `q` and returns the archive payload.

- [ ] **Step 5: Run archive route tests**

Run: `pnpm vitest run tests/integration/api/research-desk-archive-route.test.ts`
Expected: PASS.

## Task 4.5: Update Initial Loader and Archive State Wiring

**Files:**
- Modify: `src/components/research-desk/research-desk-data.ts`
- Modify: `src/components/research-desk/research-desk.tsx`
- Test: `tests/unit/components/research-desk/research-desk.test.tsx`

- [ ] **Step 1: Update `loadResearchDeskPayload`**

Load non-archived records with `status != archived`, serialize status fields, and set `selectedRecordId` via `selectPreferredRecordId`.

- [ ] **Step 2: Add archive state wiring to `ResearchDesk`**

Add `archivePayload`, `refreshArchivePayload`, archive selected record handling, and tab-aware selector source before building the archive panel UI.

- [ ] **Step 3: Run component tests**

Run: `pnpm vitest run tests/unit/components/research-desk/research-desk.test.tsx`
Expected: Progressively pass once Task 5 shell UI lands.

## Task 5: Build Workspace Shell and Sidebar

**Files:**
- Create: `src/components/research-desk/research-desk-workspace-shell.tsx`
- Create: `src/components/research-desk/research-desk-sidebar.tsx`
- Create: `src/components/research-desk/research-desk-main-tabs.tsx`
- Modify: `src/components/research-desk/research-desk.tsx`
- Modify: `src/components/research-desk/record-list.tsx`
- Test: `tests/unit/components/research-desk/research-desk.test.tsx`

- [ ] **Step 1: Write failing shell tests**

Cover:

- first render shows `运行中` tab, `新建记录`, and record selector near top.
- selector changes selected record.
- switching to `归档分析` changes selector source to archived records using the archive state introduced in Task 4.5.
- switching back restores non-archived source.

Run: `pnpm vitest run tests/unit/components/research-desk/research-desk.test.tsx`
Expected: FAIL.

- [ ] **Step 2: Implement shell layout**

Use responsive grid:

```tsx
<section className="grid gap-4 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
  <ResearchDeskSidebar ... />
  <ResearchDeskMainTabs ... />
</section>
```

Use existing `Tabs` component for right-side tabs.

- [ ] **Step 3: Implement sidebar**

Include `RecordComposerDialog`, Radix `Select` record selector, status counters, selected record summary, completion hints, and `OutcomeSummaryPanel`.

- [ ] **Step 4: Update record list**

Keep edit button and status badge. Remove direct archive button from list cards; status action lives in sidebar/detail.

- [ ] **Step 5: Run shell tests**

Run: `pnpm vitest run tests/unit/components/research-desk/research-desk.test.tsx`
Expected: PASS for updated shell expectations.

## Task 6: Build Record Panels and Status Actions

**Files:**
- Create: `src/components/research-desk/active-records-panel.tsx`
- Create: `src/components/research-desk/all-records-panel.tsx`
- Modify: `src/components/research-desk/record-detail.tsx`
- Modify: `src/components/research-desk/research-desk.tsx`
- Test: `tests/unit/components/research-desk/research-desk.test.tsx`

- [ ] **Step 1: Write failing interaction tests**

Cover:

- `开始` moves a selected record to `进行中`.
- `结束` moves it to `已结束`.
- `归档` moves it out of active/all records and into archive data after refresh.
- no running records shows not-started records and new record action.

- [ ] **Step 2: Implement panels**

`ActiveRecordsPanel` shows status stat cards and the prioritized record board.
`AllRecordsPanel` wraps `RecordList` plus status filter tabs/chips.

- [ ] **Step 3: Add status actions to detail/sidebar**

Pass `onSetRecordStatus` and `onArchiveRecord` through `ResearchDesk`. Show only the valid next action for the current status.

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run tests/unit/components/research-desk/research-desk.test.tsx`
Expected: PASS.

## Task 7: Build Archive Analysis Tab

**Files:**
- Create: `src/components/research-desk/archive-analysis-panel.tsx`
- Create: `src/components/research-desk/archive-summary-editor.tsx`
- Modify: `src/components/research-desk/research-desk.tsx`
- Test: `tests/unit/components/research-desk/research-desk.test.tsx`

- [ ] **Step 1: Write failing archive UI tests**

Cover:

- archive tab loads and displays archived records.
- empty archive state appears.
- search calls archive API with `q`.
- archive summary save calls `update-archive-summary`.
- TradingView reference title is visible in archive tab.

- [ ] **Step 2: Implement `ArchiveAnalysisPanel`**

Render archived record list/search, stat cards, `PriceChart`, selected record summary, `ArchiveSummaryEditor`, and outcome/tag aggregate using existing `OutcomeSummaryPanel`.

- [ ] **Step 3: Wire archive state in `ResearchDesk`**

Add `archivePayload`, `isArchiveLoading`, `archiveError`, `refreshArchivePayload`, and `handleSaveArchiveSummary`.

- [ ] **Step 4: Run UI tests**

Run: `pnpm vitest run tests/unit/components/research-desk/research-desk.test.tsx`
Expected: PASS.

## Task 8: Final Verification and Browser Smoke

**Files:**
- Update as needed from prior tasks.

- [ ] **Step 1: Run targeted tests**

Run:

```bash
pnpm vitest run \
  tests/unit/modules/records/record-status.test.ts \
  tests/integration/modules/records/record-service.test.ts \
  tests/integration/api/trader-records-route.test.ts \
  tests/integration/api/research-desk-archive-route.test.ts \
  tests/unit/components/research-desk/research-desk.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run broader research desk tests**

Run:

```bash
pnpm vitest run tests/unit/components/research-desk tests/integration/api
```

Expected: PASS.

- [ ] **Step 3: Run build**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 4: Start dev server and verify visually**

Run: `pnpm dev`

Verify:

- desktop first screen shows left sidebar + right tabs.
- new record button and selector are visible above the fold.
- running records are visible on first screen.
- archive tab shows TradingView reference and archive summary area.
- mobile width keeps controls usable with no horizontal overflow.

- [ ] **Step 5: Commit implementation**

Use scoped commits if practical:

```bash
git add prisma src tests
git commit -m "feat(records): 增加记录状态与归档分析"
```
