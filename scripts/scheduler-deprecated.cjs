console.error("Coin Hub 当前没有独立的 scheduler 进程。");
console.error("任务轮询已经内置在 `pnpm worker` 中。");
console.error("请改为运行：pnpm worker");
process.exit(1);
