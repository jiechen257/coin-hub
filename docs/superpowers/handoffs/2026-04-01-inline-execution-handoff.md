# Coin Hub Inline Execution Handoff

## 已落地文档

- 设计文档：`docs/superpowers/specs/2026-04-01-coin-hub-strategy-system-design.md`
- 实现计划：`docs/superpowers/plans/2026-04-01-coin-hub-web-console-implementation-plan.md`
- 本交接文档：`docs/superpowers/handoffs/2026-04-01-inline-execution-handoff.md`

## 当前分支与最近提交

- 当前分支：`codex/coin-hub-web-console`
- 最近提交：
  - `f9aebff chore: harden bootstrap repo defaults`
  - `a6263b0 chore: add env example placeholder`
  - `5ea663a chore: bootstrap nextjs web console`

## 已完成进度

### Task 1

`Task 1: Bootstrap Repository and App Shell` 已完成，并且补齐了 review 中发现的两个基础问题：

- 扩充 `.gitignore`，避免 `.next/`、`node_modules/`、`test-results/` 等产物污染工作区
- 将 `test:e2e` 调整为 `playwright test --pass-with-no-tests`，避免在还没有 e2e 用例时默认报红

已验证：

- `pnpm vitest tests/unit/app-shell-smoke.test.tsx --run` 通过
- `pnpm next build` 通过
- `pnpm test:e2e` 不再默认失败

## 当前停止点

### Task 2 正在进行中，但尚未完成

已创建但尚未最终验证/提交的文件包括：

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `prisma.config.ts`
- `src/lib/db.ts`
- `src/modules/config/config-schema.ts`
- `src/modules/config/config-repository.ts`
- `tests/integration/config-repository.test.ts`
- 以及由依赖调整带来的 `package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml` 变更

## 当前已确认的真实问题

### 1. Prisma 7 与旧式 schema 写法不兼容

已确认：

- `schema.prisma` 里的 `datasource.url = env("DATABASE_URL")` 在 Prisma 7 下不再支持
- 这个问题已经通过官方方式部分修正为 `prisma.config.ts + schema 仅保留 provider`

已验证通过：

- `pnpm prisma validate`
- `pnpm prisma generate`

### 2. 运行时 Prisma Client 仍未完全打通

仍然存在的问题：

- `pnpm tsx prisma/seed.ts` 报错：`Cannot find module '.prisma/client/default'`
- `pnpm vitest tests/integration/config-repository.test.ts --run` 报同样错误

当前尝试过的方向：

- 试图把 Prisma 从 7.x 降到 6.x，但安装流程在中途卡住，已放弃
- 已恢复到 `Prisma 7.6.0`
- 已按官方文档引入 `prisma.config.ts`
- 已安装 `@prisma/adapter-better-sqlite3`
- 已让 `db.ts` 与 `seed.ts` 改用 `PrismaBetterSqlite3`

### 3. migrate 命令参数需要按 Prisma 7 语义调整

已确认：

- `pnpm prisma migrate dev --name init --skip-seed` 在 Prisma 7 下不支持 `--skip-seed`
- 下次应直接使用：
  - `pnpm prisma migrate dev --name init`

## 下次继续时的建议顺序

1. 先检查 `node_modules/.prisma/client` 是否实际生成，以及 `@prisma/client/default.js` 指向的目标是否存在。
2. 优先解决 `Cannot find module '.prisma/client/default'` 这个 Prisma runtime 问题。
3. 解决后重新执行：
   - `pnpm prisma migrate dev --name init`
   - `pnpm tsx prisma/seed.ts`
   - `pnpm vitest tests/integration/config-repository.test.ts --run`
4. 只有当这三项都通过后，才把 Task 2 的代码提交。
5. Task 2 收口后，再进入 Task 3。

## 当前工作区状态说明

- 文档已存在，但此前尚未提交
- Task 2 的代码改动仍在工作区，属于“未验证完成的半成品”
- `task.md` 仍未纳入版本控制

## 建议的下次启动方式

下次回来时，优先执行：

```bash
git status --short
pnpm prisma validate
pnpm prisma generate
```

如果 `generate` 通过，但 `seed/test` 仍报 `.prisma/client/default` 缺失，就继续围绕 Prisma 7 的 client 输出路径排查，而不要再回头折腾大版本降级。
