import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { resolveLocalDevelopmentEnv } from "@/lib/database-runtime";
import {
  findStaleWorkspaceChange,
  isProcessAlive,
  readRunningDevServer,
} from "@/lib/dev-server-lock";

async function waitForProcessExit(pid: number, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) {
      return true;
    }

    await delay(250);
  }

  return !isProcessAlive(pid);
}

async function stopRunningServer(pid: number) {
  try {
    process.kill(pid, "SIGTERM");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    if (code !== "ESRCH") {
      throw error;
    }
  }

  if (await waitForProcessExit(pid, 10_000)) {
    return;
  }

  process.kill(pid, "SIGKILL");

  if (await waitForProcessExit(pid, 2_000)) {
    return;
  }

  throw new Error(`failed to stop running dev server pid=${pid}`);
}

async function main() {
  const lockfilePath = resolve(process.cwd(), ".next/dev/lock");
  const cliArgs = process.argv.slice(2);
  const shouldRestart = cliArgs.includes("--restart");
  const forwardedArgs = cliArgs.filter((arg) => arg !== "--restart");
  const runningServer = readRunningDevServer(lockfilePath);

  if (runningServer) {
    const staleChange = findStaleWorkspaceChange(process.cwd(), runningServer);

    if (!shouldRestart) {
      console.log(`Coin Hub dev server is already running at ${runningServer.appUrl}`);
      console.log(
        `PID ${runningServer.pid} is holding .next/dev/lock in this workspace.`,
      );

      if (staleChange) {
        console.log(
          `Workspace has newer changes at ${staleChange.path}. Run pnpm dev -- --restart to reload the dev server.`,
        );
      }

      process.exit(0);
    }

    console.log(`Restarting Coin Hub dev server on ${runningServer.appUrl} ...`);
    await stopRunningServer(runningServer.pid);
  }

  const nextBin = resolve(process.cwd(), "node_modules/next/dist/bin/next");
  const nextArgs = [nextBin, "dev", ...forwardedArgs];
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
}

void main();
