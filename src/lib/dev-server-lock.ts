import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export type DevServerInfo = {
  pid: number;
  port: number;
  hostname: string;
  appUrl: string;
  startedAt: number;
};

export type WorkspaceChangeInfo = {
  path: string;
  mtimeMs: number;
};

const DEFAULT_WORKSPACE_WATCH_TARGETS = [
  "src",
  "prisma/schema.prisma",
  "prisma/migrations",
  "scripts",
  "docs",
  "README.md",
  "package.json",
  "next.config.ts",
  "tsconfig.json",
  "tailwind.config.ts",
];
const IGNORED_DIRECTORY_NAMES = new Set([
  ".git",
  ".next",
  "node_modules",
  "coverage",
  "dist",
]);

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

function readEntryStat(path: string) {
  try {
    return statSync(path);
  } catch {
    return undefined;
  }
}

function findNewestEntryInPath(
  workspaceRoot: string,
  absolutePath: string,
): WorkspaceChangeInfo | undefined {
  const stat = readEntryStat(absolutePath);

  if (!stat) {
    return undefined;
  }

  if (stat.isDirectory()) {
    const directoryName = absolutePath.split("/").pop();

    if (directoryName && IGNORED_DIRECTORY_NAMES.has(directoryName)) {
      return undefined;
    }

    let newestEntry: WorkspaceChangeInfo | undefined;

    for (const entryName of readdirSync(absolutePath)) {
      const candidate = findNewestEntryInPath(
        workspaceRoot,
        join(absolutePath, entryName),
      );

      if (!candidate) {
        continue;
      }

      if (!newestEntry || candidate.mtimeMs > newestEntry.mtimeMs) {
        newestEntry = candidate;
      }
    }

    return newestEntry;
  }

  return {
    path: relative(workspaceRoot, absolutePath),
    mtimeMs: stat.mtimeMs,
  };
}

export function findNewestWorkspaceChange(
  workspaceRoot: string,
  watchTargets = DEFAULT_WORKSPACE_WATCH_TARGETS,
) {
  let newestChange: WorkspaceChangeInfo | undefined;

  for (const target of watchTargets) {
    const candidate = findNewestEntryInPath(workspaceRoot, join(workspaceRoot, target));

    if (!candidate) {
      continue;
    }

    if (!newestChange || candidate.mtimeMs > newestChange.mtimeMs) {
      newestChange = candidate;
    }
  }

  return newestChange;
}

export function findStaleWorkspaceChange(
  workspaceRoot: string,
  server: DevServerInfo,
  watchTargets = DEFAULT_WORKSPACE_WATCH_TARGETS,
) {
  const newestChange = findNewestWorkspaceChange(workspaceRoot, watchTargets);

  if (!newestChange) {
    return undefined;
  }

  return newestChange.mtimeMs > server.startedAt ? newestChange : undefined;
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
