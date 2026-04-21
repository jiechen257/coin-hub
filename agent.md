# Coin Hub Agent Context

## 项目目标

Coin Hub 是一个交易员策略研究台。首页同时承载三块工作：

1. 本地研究图和结果轨道
2. TradingView 次级行情核对
3. 记录录入、样本结算、候选策略沉淀

当前主线是 `research desk`，旧版 console 逻辑已经移除。

## 技术栈

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS + shadcn/ui
- Prisma 7
- 本地数据库：SQLite
- 云端数据库：Turso / libsql
- 部署：Vercel

## 运行方式

### 本地

- `pnpm install`
- `pnpm dev`

本地默认使用 `prisma/dev.db`。

### 生产

- Vercel 运行 Next.js
- 运行时数据库使用 Turso
- 生产数据库 schema 不会自动跟随 Prisma migration
- 当前项目已经加了运行期 research desk schema 自愈逻辑，用来兜住 Turso 未补齐的新列和表

## 关键目录

- `/src/app`
  - App Router 页面和 API
- `/src/components/research-desk`
  - 首页研究台组件
- `/src/modules/records`
  - 记录 schema、序列化、服务、仓储
- `/src/modules/outcomes`
  - outcome 计算、review tag、结果查询
- `/src/modules/traders`
  - 交易员资料
- `/src/lib`
  - DB、环境、开发锁、运行期 bootstrap
- `/prisma`
  - schema 和 migration
- `/scripts`
  - 本地工具脚本

## 核心数据模型

### TraderProfile

交易员主档。

### TraderRecord

研究记录主体。当前重点字段：

- `startedAt / endedAt`
- `recordType`
- `sourceType`
- `rawContent`
- `morphology`
- `archivedAt`

### ExecutionPlan

附着在记录上的执行方案。`view` 记录可以有多个 plan。

### RecordOutcome

记录或方案的观察结果，用于结果轨道、右侧详情和 review tag。

## 首页阅读结构

首页默认进入 `ResearchDesk`。

阅读顺序：

1. 本地研究图
2. 趋势轨道 / 时间窗轨道 / 结果轨道
3. 右侧结果详情
4. 下方最近记录和录入区

当前约束：

- K 线主图不再直接画缠论形态
- 缠论相关结构落在摘要卡片和时间轨道
- 结果轨道使用“摘要卡片 + 定位条”

## 重要实现点

### 记录创建

- API: `/api/trader-records`
- 服务: `src/modules/records/record-service.ts`
- 仓储: `src/modules/records/record-repository.ts`

创建记录后会尝试同步 outcome。outcome 失败会记日志，但不会阻断记录创建。

### 首页数据加载

- `src/components/research-desk/research-desk-data.ts`
- `src/components/research-desk/research-desk-chart-slice.ts`

页面允许 chart/outcome 层单独降级为空，保证首页仍可打开。

### 生产 schema 自愈

- `src/lib/research-desk-schema-bootstrap.ts`

触发点：

- 首页 research desk 数据加载
- `/api/trader-records` GET / POST / PATCH

用途：

- 给旧版 Turso schema 自动补齐 `TraderRecord` 新列
- 自动补齐 outcome 相关表和索引

## 当前已知运行约束

- 本地和生产数据源是隔离的
- 本地 SQLite 数据不会自动同步到生产 Turso
- 生产如果只部署代码、不补数据库 schema，记录相关 API 可能在运行期报 500
- `pnpm dev` 如果出现 `stale Turbopack`，需要 `pnpm dev -- --restart`

## 常用命令

- `pnpm dev`
- `pnpm dev -- --restart`
- `pnpm test`
- `pnpm build`
- `node scripts/sync-trader-records-to-production.mjs`

## 当前分支策略

- 默认直接在 `main` 分支开发
- 用户明确要求隔离分支、PR、风险隔离或并行开发时，再创建新分支

## 当前提交偏好

- 多个独立工作流默认分段提交
- 优先拆分为：
  - 数据模型与迁移
  - 后端接口
  - 前端交互与样式
  - 开发工具与文档
