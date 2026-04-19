# Coin Hub

Coin Hub 是一个本地交易员策略研究台。首页优先展示记录 K 线图工作台，本地研究图负责 outcome 复盘，TradingView 保留为次级参考位。

## 环境要求

- Node.js 22.x
- pnpm 10

## 本地启动

1. `nvm use`
2. `pnpm install`
3. `pnpm dev`

`pnpm dev` 会自动创建本地 SQLite 文件并执行迁移，然后启动研究台。

打开 [http://localhost:3000](http://localhost:3000)，在同一个页面里完成：

- 首屏查看记录 K 线图工作台、本地研究图和 outcome 轨道
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

- `pnpm dev` 自动准备数据库并启动研究台
- `pnpm test` 运行单元和集成测试
- `pnpm test:e2e` 运行 Playwright E2E
- `pnpm build` 构建生产包

## 免费云部署

推荐组合：`Vercel Hobby + Turso Free`

- 本地开发继续使用 SQLite：`DATABASE_URL=file:./prisma/dev.db`
- 云端运行时使用 Turso：`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`
- Prisma CLI 仍然使用本地 SQLite 生成迁移，避免把 `migrate` 直接打到 Turso

### Turso 准备

1. 创建数据库：`turso db create coin-hub`
2. 查看连接地址：`turso db show coin-hub`
3. 创建访问令牌：`turso db tokens create coin-hub`

### Vercel 环境变量

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `APP_PASSWORD`
- `NEXT_PUBLIC_SITE_URL`

### 迁移发布流程

1. 本地生成迁移：`pnpm prisma migrate dev --name <migration-name>`
2. 将生成的 SQL 应用到 Turso：

```bash
turso db shell coin-hub < ./prisma/migrations/<timestamp>_<migration-name>/migration.sql
```

### 部署说明

- Vercel 构建阶段只需要 `pnpm build`
- `postinstall` 会自动执行 `prisma generate`
- 线上运行时会优先连接 Turso；本地没有配置 Turso 时继续使用 SQLite

## 验证清单

- `pnpm test`
- `pnpm test:e2e`
- `pnpm build`
