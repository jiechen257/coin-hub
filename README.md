# Coin Hub

Coin Hub 是一个本地交易员策略研究台。首页优先展示记录 K 线图工作台，本地研究图负责 outcome 复盘，TradingView 保留为次级参考位。

## 环境要求

- Node.js 22.x
- pnpm 10

## 本地启动

1. `nvm use`
2. `pnpm install`
3. `pnpm dev`

`pnpm dev` 会自动创建本地 SQLite 文件并执行迁移，然后以“日常数据库”目标启动研究台。

本地数据库目标约定：

- `pnpm dev` / `pnpm dev:daily`：连接日常 Turso 数据库
- `pnpm dev:prod`：连接生产 Turso 数据库
- `pnpm dev:local`：回退到本地 SQLite

建议把本地私有 Turso 凭证放在 `.env.local`：

- `TURSO_DAILY_DATABASE_URL`
- `TURSO_DAILY_AUTH_TOKEN`
- `TURSO_PRODUCTION_DATABASE_URL`
- `TURSO_PRODUCTION_AUTH_TOKEN`

打开 [http://localhost:3000](http://localhost:3000)，在同一个页面里完成：

- 首屏查看记录 K 线图工作台、本地研究图和 outcome 轨道
- 记录录入支持 `startedAt / endedAt` 时间区间
- 行情观点支持附带 `morphology` 结构化数据
- 趋势轨道、时间窗轨道、结果轨道都采用“摘要卡片 + 定位条”阅读结构
- 用 TradingView 次级参考位补充行情细节核对
- 在次级工作区里新增交易员、录入真实开单或行情观点
- 给 outcome 打 review tag，并按 good / neutral / bad 与 review tag 回看结果
- 结算执行方案样本并归纳候选策略

## 首屏工作流

首页默认进入记录 K 线图工作台，研究流程按这个顺序展开：

1. 先看本地研究图、Outcome 总览和 Outcome 详情
2. 用 TradingView 参考视图核对原生行情细节
3. 在次级工作区新建记录、切换最近样本、继续结算和策略归纳

研究图控制条支持两类回看：

- `good / neutral / bad` 结果过滤
- `review tag` 标签过滤

## 常用命令

- `pnpm dev` 自动准备数据库并启动研究台，默认连接日常库
- `pnpm dev:daily` 显式连接日常 Turso 数据库
- `pnpm dev:prod` 显式连接生产 Turso 数据库
- `pnpm dev:local` 显式连接本地 SQLite
- `pnpm dev -- --restart` 强制重启当前工作区的 dev server
- `pnpm test` 运行单元和集成测试
- `pnpm test:e2e` 运行 Playwright E2E
- `pnpm build` 构建生产包

## Next.js 本地排障

出现下面两类现象时，优先按 stale dev server 处理：

- DevTools 右上角显示 `Next.js ... (stale) Turbopack`
- 页面报 `Hydration failed because the server rendered HTML didn't match the client`

处理方式：

1. 运行 `pnpm dev -- --restart`
2. 刷新 [http://localhost:3000](http://localhost:3000)

`pnpm dev` 在检测到当前工作区文件比运行中的 dev server 更新时，会提示使用 `--restart`。这类问题通常表现为：

- 服务端 HTML 仍然是旧版组件结构
- 浏览器加载了新版 client bundle
- 首屏 hydration 直接失败

## 免费云部署

推荐组合：`Vercel Hobby + Turso Free`

- Prisma CLI 继续使用本地 SQLite：`LOCAL_DATABASE_URL=file:./prisma/dev.db`
- 本地 `pnpm dev` 默认连接日常 Turso，`pnpm dev:local` 才回退到 SQLite
- 云端运行时继续使用 canonical Turso 变量：`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`
- Prisma CLI 仍然使用本地 SQLite 生成迁移，避免把 `migrate` 直接打到 Turso

### Turso 准备

1. 创建日常数据库：`turso db create coin-hub-daily`
2. 创建生产数据库：`turso db create coin-hub`
3. 分别查看连接地址：`turso db show coin-hub-daily`、`turso db show coin-hub`
4. 分别创建访问令牌：`turso db tokens create coin-hub-daily`、`turso db tokens create coin-hub`

### Vercel 环境变量

- `Production`：`TURSO_DATABASE_URL=<生产库>`、`TURSO_AUTH_TOKEN=<生产 token>`
- `Preview`：`TURSO_DATABASE_URL=<日常库>`、`TURSO_AUTH_TOKEN=<日常 token>`
- `Development`：`TURSO_DATABASE_URL=<日常库>`、`TURSO_AUTH_TOKEN=<日常 token>`
- `APP_PASSWORD`
- `NEXT_PUBLIC_SITE_URL`

### 迁移发布流程

1. 本地生成迁移：`pnpm prisma migrate dev --name <migration-name>`
2. 先将生成的 SQL 应用到日常库：

```bash
turso db shell coin-hub-daily < ./prisma/migrations/<timestamp>_<migration-name>/migration.sql
```

3. 验证日常库和 Preview 部署行为正常
4. 再将同一份 SQL 应用到生产库：

```bash
turso db shell coin-hub < ./prisma/migrations/<timestamp>_<migration-name>/migration.sql
```

### 部署说明

- Vercel 构建阶段只需要 `pnpm build`
- `postinstall` 会自动执行 `prisma generate`
- 线上运行时会优先连接 Turso
- `pnpm dev:prod` 会真实读写生产数据库，只适合需要直接核对生产数据的本地会话
- 本地没有配置日常 / 生产 Turso 源变量时，可以继续使用 `pnpm dev:local`

## 验证清单

- `pnpm test`
- `pnpm test:e2e`
- `pnpm build`
