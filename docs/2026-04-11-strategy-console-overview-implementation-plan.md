# Strategy Console Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current `/ -> /config` entry with a real strategy overview homepage that surfaces market summary, asset status, risks, operations state, active config, and quick actions using existing persisted data.

**Architecture:** Add a dedicated server-side overview aggregation layer that reads `RunSnapshot`, `Job`, `ReplayJob`, and active `ConfigVersion` into one normalized payload. Render the new `/` page from the server with shared `AppShell` navigation, and keep client-side interactivity limited to quick actions and active-route highlighting.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Prisma + SQLite, Tailwind CSS, Vitest, Playwright

---

## File Map

### Create

- `src/modules/overview/overview-service.ts` — 首页聚合数据加载器，统一输出 `OverviewPayload`
- `src/app/api/overview/route.ts` — 首页聚合接口，供测试与后续客户端刷新复用
- `src/components/app-shell/app-nav.tsx` — 顶部主导航，负责高亮当前路由
- `src/components/overview/overview-dashboard.tsx` — 首页总览主布局
- `src/components/overview/overview-summary-strip.tsx` — 市场摘要条
- `src/components/overview/overview-operations-panel.tsx` — 任务与运行状态面板
- `src/components/overview/overview-config-card.tsx` — 生效配置摘要卡
- `src/components/overview/overview-quick-actions.tsx` — 首页快速操作区
- `tests/integration/modules/overview/overview-service.test.ts` — 首页聚合服务测试
- `tests/integration/api/overview-route.test.ts` — 首页聚合接口测试
- `tests/e2e/overview.spec.ts` — 首页端到端验证

### Modify

- `src/app/page.tsx` — 从重定向改为首页服务端页面
- `src/components/app-shell/app-shell.tsx` — 增加统一导航与首页入口
- `src/app/(protected)/command-center/page.tsx` — 旧命令中心入口重定向回 `/`
- `src/components/command-center/asset-signal-card.tsx` — 支持首页复用所需的轻微文案/空状态调整
- `src/components/command-center/risk-panel.tsx` — 支持展示首页风险面板所需字段
- `tests/e2e/dashboard.spec.ts` — 更新或退役旧命令中心用例，避免遗留路由断言阻塞 CI
- `tests/e2e/auth.spec.ts` — 更新根路由预期
- `tests/e2e/full-console.spec.ts` — 更新完整流程的起始页与导航行为
- `tests/unit/app-shell-smoke.test.tsx` — 更新外壳导航 smoke test

### Optional Modify (only if needed during implementation)

- `src/app/(protected)/config/page.tsx` — 仅在需要补“返回总览”文案或入口时调整
- `src/app/(protected)/runs/page.tsx` — 仅在需要补首页跳转入口文案时调整
- `src/app/(protected)/replay/page.tsx` — 仅在需要补首页跳转入口文案时调整

## Shared Rules

- 所有新增函数和关键逻辑必须补中文注释，符合仓库当前用户要求
- 第一阶段不改 `analysis-data` 的 demo 数据链路，不把分析页强行升级成真实首页数据源
- “运行策略版本” 与 “生效配置版本” 必须分开命名，禁止混用“当前版本”
- “提交 replay” 快速操作第一阶段定义为 **跳转到 `/replay`**，不新增首页内联 replay 表单
- 首页聚合层优先返回空状态与默认值，不因单个分区缺数据导致整页不可用

## Task 1: Define the Overview Payload and Aggregation Service

**Files:**
- Create: `src/modules/overview/overview-service.ts`
- Test: `tests/integration/modules/overview/overview-service.test.ts`

- [ ] **Step 1: Write the failing integration test for the overview payload**

```ts
it("aggregates latest run, active config, queued jobs, replay counts, and failed jobs", async () => {
  const payload = await getOverviewPayload();

  expect(payload.marketSummary.strategyVersion).toBe("baseline-v2");
  expect(payload.assets).toHaveLength(2);
  expect(payload.operations.queuedJobCount).toBe(2);
  expect(payload.operations.recentFailedJobs).toHaveLength(1);
  expect(payload.marketSummary.latestRunAt).toContain("2026-04-11");
  expect(payload.operations.recentRunCount24h).toBe(3);
  expect(payload.operations.recentReplayCount24h).toBe(2);
  expect(payload.activeConfig.summary).toBe("guardrails v12");
});
```

Also add an explicit empty-state test:

```ts
it("returns empty-safe defaults when there is no run snapshot or active config", async () => {
  const payload = await getOverviewPayload();

  expect(payload.marketSummary.strategyVersion).toBeNull();
  expect(payload.marketSummary.latestRunAt).toBeNull();
  expect(payload.assets).toEqual([]);
  expect(payload.operations.queuedJobCount).toBe(0);
  expect(payload.activeConfig.summary).toBeNull();
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm vitest run tests/integration/modules/overview/overview-service.test.ts`  
Expected: FAIL because `overview-service.ts` and `getOverviewPayload` do not exist yet

- [ ] **Step 3: Implement the minimal overview service**

Add `getOverviewPayload()` with these rules:

```ts
export async function getOverviewPayload(): Promise<OverviewPayload> {
  const [latestRun, activeConfig, queuedCount, recentRunCount24h, recentReplayCount24h, failedJobs] =
    await Promise.all([
      db.runSnapshot.findFirst({ orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
      db.configVersion.findFirst({ where: { isActive: true }, orderBy: { createdAt: "desc" } }),
      db.job.count({ where: { status: { in: ["queued", "processing"] } } }),
      db.runSnapshot.count({ where: { createdAt: { gte: dayAgo } } }),
      db.replayJob.count({ where: { createdAt: { gte: dayAgo } } }),
      db.job.findMany({ where: { status: "failed" }, orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }], take: 5 }),
    ]);

  return mapOverviewPayload(...);
}
```

Implementation requirements:

- 用中文注释解释聚合口径、时间窗口和空状态处理
- 资产卡证据直接截取 `latestRun.assetsJson[asset].evidence.slice(0, 3)`
- 没有 `RunSnapshot` 时，返回完整空 payload，而不是抛错
- 失败任务按 spec 固定为最近 5 条

- [ ] **Step 4: Re-run the focused test and make it pass**

Run: `pnpm vitest run tests/integration/modules/overview/overview-service.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/overview/overview-service.ts tests/integration/modules/overview/overview-service.test.ts
git commit -m "feat: add strategy overview aggregation service"
```

## Task 2: Expose the Overview Aggregate Route

**Files:**
- Create: `src/app/api/overview/route.ts`
- Test: `tests/integration/api/overview-route.test.ts`

- [ ] **Step 1: Write the failing API test**

```ts
it("returns the overview payload for the strategy homepage", async () => {
  const response = await GET();
  const data = await response.json();

  expect(response.status).toBe(200);
  expect(data).toHaveProperty("marketSummary");
  expect(data).toHaveProperty("assets");
  expect(data).toHaveProperty("operations");
  expect(data).toHaveProperty("activeConfig");
});
```

- [ ] **Step 2: Run the focused API test and verify it fails**

Run: `pnpm vitest run tests/integration/api/overview-route.test.ts`  
Expected: FAIL because the route does not exist yet

- [ ] **Step 3: Implement the API route as a thin wrapper**

```ts
export async function GET() {
  const payload = await getOverviewPayload();
  return NextResponse.json(payload);
}
```

Implementation requirements:

- 路由层不要重复写聚合逻辑，直接复用 `overview-service`
- 用中文注释说明这是首页总览接口
- 如果后续实现需要错误兜底，优先在 service 层做默认值，在 route 层保持薄包装

- [ ] **Step 4: Run the focused API test and the service test**

Run: `pnpm vitest run tests/integration/api/overview-route.test.ts tests/integration/modules/overview/overview-service.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/overview/route.ts tests/integration/api/overview-route.test.ts src/modules/overview/overview-service.ts
git commit -m "feat: expose overview api route"
```

## Task 3: Add Shared Navigation and Replace the Root Route

**Files:**
- Create: `src/components/app-shell/app-nav.tsx`
- Modify: `src/components/app-shell/app-shell.tsx`
- Modify: `src/app/page.tsx`
- Modify: `tests/unit/app-shell-smoke.test.tsx`
- Modify: `tests/e2e/auth.spec.ts`

- [ ] **Step 1: Write failing tests for root routing and shell navigation**

Add/update assertions for:

```ts
await page.goto("http://localhost:3000/");
await expect(page).toHaveURL("http://localhost:3000/");
await expect(page.getByRole("link", { name: "总览" })).toBeVisible();
await expect(page.getByRole("link", { name: "配置" })).toBeVisible();
```

For the unit smoke test:

```tsx
render(<AppShell><div>body</div></AppShell>);
expect(screen.getByRole("link", { name: "总览" })).toBeInTheDocument();
```

- [ ] **Step 2: Run the shell and auth tests and verify they fail**

Run: `pnpm vitest run tests/unit/app-shell-smoke.test.tsx`  
Run: `pnpm playwright test tests/e2e/auth.spec.ts`  
Expected: FAIL because `/` still redirects to `/config` and there is no nav

- [ ] **Step 3: Implement shared navigation and root page behavior**

Implementation requirements:

- `app-nav.tsx` 使用 `usePathname()` 高亮当前页面
- `AppShell` 在标题下或右侧增加主导航：`总览 / 研究 / 运行 / 回放 / 配置`
- `src/app/page.tsx` 改为服务端首页，不再 `redirect("/config")`
- 首页页面本身直接使用 `AppShell`，保持和二级页一致的骨架
- 所有导航和关键逻辑补中文注释

Suggested structure:

```tsx
export default async function HomePage() {
  const payload = await getOverviewPayload();

  return (
    <AppShell>
      <OverviewDashboard initialData={payload} />
    </AppShell>
  );
}
```

- [ ] **Step 4: Re-run the shell/auth tests**

Run: `pnpm vitest run tests/unit/app-shell-smoke.test.tsx`  
Run: `pnpm playwright test tests/e2e/auth.spec.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/app-shell/app-nav.tsx src/components/app-shell/app-shell.tsx src/app/page.tsx tests/unit/app-shell-smoke.test.tsx tests/e2e/auth.spec.ts
git commit -m "feat: add strategy shell navigation and homepage entry"
```

## Task 4: Build the Overview Homepage UI and Quick Actions

**Files:**
- Create: `src/components/overview/overview-dashboard.tsx`
- Create: `src/components/overview/overview-summary-strip.tsx`
- Create: `src/components/overview/overview-operations-panel.tsx`
- Create: `src/components/overview/overview-config-card.tsx`
- Create: `src/components/overview/overview-quick-actions.tsx`
- Modify: `src/components/command-center/asset-signal-card.tsx`
- Modify: `src/components/command-center/risk-panel.tsx`

- [ ] **Step 1: Write the failing overview page test**

Create an e2e test that checks the homepage shows the six required sections:

```ts
await page.goto("http://localhost:3000/");
await expect(page.getByRole("heading", { name: "策略总览" })).toBeVisible();
await expect(page.getByText("运行策略版本")).toBeVisible();
await expect(page.getByText("最新运行时间")).toBeVisible();
await expect(page.getByRole("heading", { name: "BTC", level: 3 })).toBeVisible();
await expect(page.getByText("风险与告警")).toBeVisible();
await expect(page.getByText("任务与运行状态")).toBeVisible();
await expect(page.getByText("当前生效配置")).toBeVisible();
await expect(page.getByText("最近 24 小时运行数")).toBeVisible();
await expect(page.getByText("最近 24 小时回放数")).toBeVisible();
await expect(page.getByRole("button", { name: "运行分析" })).toBeVisible();
await expect(page.getByRole("link", { name: "提交回放" })).toBeVisible();
```

- [ ] **Step 2: Run the overview e2e test and verify it fails**

Run: `pnpm playwright test tests/e2e/overview.spec.ts`  
Expected: FAIL because the overview UI has not been built

- [ ] **Step 3: Implement the overview dashboard**

Implementation requirements:

- 首页一个屏幕内至少出现：市场摘要、资产卡、风险与告警、任务与运行状态、当前生效配置、快速操作
- 重点资产卡优先复用现有 `AssetSignalCard`，仅在首页需要时扩展空状态或文案
- 风险面板优先复用现有 `RiskPanel`，仅补首页需要的“最近失败任务”展示
- `OverviewQuickActions` 中：
  - `运行分析`：复用 `/api/analysis/run`，成功后 `router.refresh()`
  - `查看研究工作台`：链接到 `/analysis`
  - `提交回放`：链接到 `/replay`
  - `进入配置管理`：链接到 `/config`
- 首页缺数据时显示空状态，不隐藏整个区块
- 所有新增函数、聚合映射、快速操作逻辑都补中文注释

Suggested composition:

```tsx
<OverviewSummaryStrip data={initialData.marketSummary} />
<div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
  <section>{/* BTC / ETH asset cards + quick actions */}</section>
  <aside>{/* risk panel + operations panel + config card */}</aside>
</div>
```

- [ ] **Step 4: Re-run the overview e2e test**

Run: `pnpm playwright test tests/e2e/overview.spec.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/overview src/components/command-center/asset-signal-card.tsx src/components/command-center/risk-panel.tsx tests/e2e/overview.spec.ts src/app/page.tsx
git commit -m "feat: build strategy overview homepage"
```

## Task 5: Redirect the Legacy Command Center and Update Flow Tests

**Files:**
- Modify: `src/app/(protected)/command-center/page.tsx`
- Modify: `tests/e2e/dashboard.spec.ts`
- Modify: `tests/e2e/full-console.spec.ts`

- [ ] **Step 1: Write the failing regression expectation**

Update the full-console flow so it starts from `/`, validates overview, then continues to config, replay, and runs:

```ts
await page.goto("/");
await expect(page.getByRole("heading", { name: "策略总览" })).toBeVisible();
await expect(page.getByRole("heading", { name: "BTC", level: 3 })).toBeVisible();
```

Also add:

```ts
await page.goto("/command-center");
await expect(page).toHaveURL("http://localhost:3000/");
```

Update the legacy dashboard test in the same change set:

```ts
await page.goto("http://localhost:3000/command-center");
await expect(page).toHaveURL("http://localhost:3000/");
await expect(page.getByRole("heading", { name: "策略总览" })).toBeVisible();
```

- [ ] **Step 2: Run the full-console e2e and verify it fails**

Run: `pnpm playwright test tests/e2e/full-console.spec.ts`  
Expected: FAIL until the legacy route and homepage flow are aligned

Run: `pnpm playwright test tests/e2e/dashboard.spec.ts`  
Expected: FAIL until the legacy route expectation is updated

- [ ] **Step 3: Redirect the legacy route**

Implementation requirements:

- `src/app/(protected)/command-center/page.tsx` 改为 `redirect("/")`
- 不删除原有 `command-center` 组件文件，先保留，避免本阶段扩大改动面

Example:

```tsx
export default function CommandCenterPage() {
  redirect("/");
}
```

- [ ] **Step 4: Re-run the full-console e2e**

Run: `pnpm playwright test tests/e2e/full-console.spec.ts`  
Expected: PASS

Run: `pnpm playwright test tests/e2e/dashboard.spec.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/(protected)/command-center/page.tsx tests/e2e/dashboard.spec.ts tests/e2e/full-console.spec.ts
git commit -m "refactor: redirect legacy command center to overview"
```

## Task 6: Final Verification and Build Proof

**Files:**
- Modify as needed from previous tasks only

- [ ] **Step 1: Run the targeted verification set**

Run: `pnpm vitest run tests/integration/modules/overview/overview-service.test.ts tests/integration/api/overview-route.test.ts tests/unit/app-shell-smoke.test.tsx`  
Expected: PASS

Run: `pnpm playwright test tests/e2e/overview.spec.ts tests/e2e/auth.spec.ts tests/e2e/dashboard.spec.ts tests/e2e/full-console.spec.ts`  
Expected: PASS

- [ ] **Step 2: Run the full test suite**

Run: `pnpm test`  
Expected: PASS

- [ ] **Step 3: Run the production build**

Run: `pnpm build`  
Expected: PASS

- [ ] **Step 4: Manual smoke check in browser**

Run: `pnpm dev`  
Expected: dev server starts successfully

Manual checklist:

- 访问 `/` 能看到策略总览首页
- 顶部导航能进入 `研究 / 运行 / 回放 / 配置`
- 点击 `运行分析` 后会出现入队反馈并刷新首页
- 空状态下首页区块仍然完整

- [ ] **Step 5: Commit the final polish**

```bash
git add src/app src/components src/modules tests
git commit -m "test: verify strategy overview console flow"
```

## Execution Notes

- 如果在 Task 4 发现首页信息区块过多导致首屏拥挤，优先压缩视觉密度，不增加新分页
- 如果首页聚合服务发现单个查询失败会导致整页失败，优先在 `overview-service.ts` 中用默认值兜底，而不是在 UI 层堆复杂判空
- 如果实现过程中发现 `AssetSignalCard` 或 `RiskPanel` 复用成本过高，再拆出首页专用组件，但需要先判断是否真的比轻量修改更简单
