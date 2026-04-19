import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { resolveLocalDevelopmentEnv } from "@/lib/database-runtime";
import { readRunningDevServer } from "@/lib/dev-server-lock";

const lockfilePath = resolve(process.cwd(), ".next/dev/lock");
const runningServer = readRunningDevServer(lockfilePath);

if (runningServer) {
  console.log(`Coin Hub dev server is already running at ${runningServer.appUrl}`);
  console.log(`PID ${runningServer.pid} is holding .next/dev/lock in this workspace.`);
  process.exit(0);
}

const nextBin = resolve(process.cwd(), "node_modules/next/dist/bin/next");
const nextArgs = [nextBin, "dev", ...process.argv.slice(2)];
const child = spawn(process.execPath, nextArgs, {
  cwd: process.cwd(),
  env: resolveLocalDevelopmentEnv(process.env) as NodeJS.ProcessEnv,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
