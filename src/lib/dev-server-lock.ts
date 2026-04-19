import { readFileSync } from "node:fs";

export type DevServerInfo = {
  pid: number;
  port: number;
  hostname: string;
  appUrl: string;
  startedAt: number;
};

function isDevServerInfo(value: unknown): value is DevServerInfo {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.pid === "number" &&
    typeof candidate.port === "number" &&
    typeof candidate.hostname === "string" &&
    typeof candidate.appUrl === "string" &&
    typeof candidate.startedAt === "number"
  );
}

export function parseDevServerInfo(content: string) {
  try {
    const parsed = JSON.parse(content) as unknown;
    return isDevServerInfo(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function isProcessAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ESRCH") {
      return false;
    }

    if (code === "EPERM") {
      return true;
    }

    throw error;
  }
}

export function readRunningDevServer(
  lockfilePath: string,
  readLockfile: (path: string) => string | undefined = (path) => {
    try {
      return readFileSync(path, "utf8");
    } catch {
      return undefined;
    }
  },
  checkAlive: (pid: number) => boolean = isProcessAlive,
) {
  const content = readLockfile(lockfilePath);
  if (!content) {
    return undefined;
  }

  const server = parseDevServerInfo(content);
  if (!server) {
    return undefined;
  }

  return checkAlive(server.pid) ? server : undefined;
}
