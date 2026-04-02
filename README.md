# Coin Hub

Coin Hub 是一个单用户的策略控制台，包含登录、配置版本管理、replay 提交、run history 和 worker 运行入口。

## 环境要求

- Node.js 22.x（仓库内的 `.nvmrc` 当前固定为 `22.21.1`）
- pnpm 10

## 本地启动

1. `nvm use`
2. `pnpm install`
3. `pnpm prisma migrate dev`
4. `pnpm tsx prisma/seed.ts`
5. `pnpm dev`
6. 另开终端运行 `pnpm worker`

默认登录密码来自 `.env` 里的 `APP_PASSWORD`，请先确保它和测试环境一致。

当前版本不需要单独启动 `scheduler` 进程，队列轮询已经内置在 `pnpm worker` 中。

## 常用脚本

- `pnpm dev` 启动 Next 开发服务器
- `pnpm worker` 启动队列轮询与任务处理
- `pnpm scheduler` 输出提示信息，提醒改用 `pnpm worker`
- `pnpm test` 运行单元和集成测试
- `pnpm test:e2e` 运行 Playwright E2E
- `pnpm next build` 构建生产包

## 健康检查

`GET /api/health` 会做最小 readiness 检查：

- 返回 `status: "ok"` 时表示应用和数据库都可读
- 返回 `503` 时表示数据库不可用或运行时异常

## 验证清单

- `pnpm test`
- `pnpm test:e2e`
- `pnpm next build`
- `pnpm tsx src/worker/index.ts --once`
