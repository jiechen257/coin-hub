# Coin Hub

Coin Hub 是一个本地交易员策略研究台。

## 环境要求

- Node.js 22.x
- pnpm 10

## 本地启动

1. `nvm use`
2. `pnpm install`
3. `pnpm dev`

`pnpm dev` 会自动创建本地 SQLite 文件并执行迁移，然后启动研究台。

打开 [http://localhost:3000](http://localhost:3000)，在同一个页面里完成：

- 新增交易员
- 录入真实开单或行情观点
- 结算执行方案样本
- 归纳候选策略

## 常用命令

- `pnpm dev` 自动准备数据库并启动研究台
- `pnpm test` 运行单元和集成测试
- `pnpm test:e2e` 运行 Playwright E2E
- `pnpm build` 构建生产包

## 验证清单

- `pnpm test`
- `pnpm test:e2e`
- `pnpm build`
