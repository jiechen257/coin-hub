// @vitest-environment node

import { mkdtempSync, mkdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  findStaleWorkspaceChange,
  isProcessAlive,
  parseDevServerInfo,
  readRunningDevServer,
} from "@/lib/dev-server-lock";

const temporaryDirectories: string[] = [];

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    const directory = temporaryDirectories.pop();

    if (directory) {
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

describe("parseDevServerInfo", () => {
  it("returns server info for valid lock content", () => {
    expect(
      parseDevServerInfo(
        JSON.stringify({
          pid: 11142,
          port: 3000,
          hostname: "localhost",
          appUrl: "http://localhost:3000",
          startedAt: 1776488961556,
        }),
      ),
    ).toEqual({
      pid: 11142,
      port: 3000,
      hostname: "localhost",
      appUrl: "http://localhost:3000",
      startedAt: 1776488961556,
    });
  });

  it("returns undefined for invalid lock content", () => {
    expect(parseDevServerInfo('{"pid":"11142"}')).toBeUndefined();
    expect(parseDevServerInfo("not-json")).toBeUndefined();
  });
});

describe("isProcessAlive", () => {
  it("returns false when the process is missing", () => {
    const killSpy = vi.spyOn(process, "kill").mockImplementation(() => {
      const error = new Error("missing") as NodeJS.ErrnoException;
      error.code = "ESRCH";
      throw error;
    });

    expect(isProcessAlive(11142)).toBe(false);
    killSpy.mockRestore();
  });

  it("returns true when the process exists but cannot be signaled", () => {
    const killSpy = vi.spyOn(process, "kill").mockImplementation(() => {
      const error = new Error("forbidden") as NodeJS.ErrnoException;
      error.code = "EPERM";
      throw error;
    });

    expect(isProcessAlive(11142)).toBe(true);
    killSpy.mockRestore();
  });
});

describe("readRunningDevServer", () => {
  it("returns the running server when the lock is valid and alive", () => {
    expect(
      readRunningDevServer(
        ".next/dev/lock",
        () =>
          JSON.stringify({
            pid: 11142,
            port: 3000,
            hostname: "localhost",
            appUrl: "http://localhost:3000",
            startedAt: 1776488961556,
          }),
        () => true,
      ),
    ).toEqual({
      pid: 11142,
      port: 3000,
      hostname: "localhost",
      appUrl: "http://localhost:3000",
      startedAt: 1776488961556,
    });
  });

  it("returns undefined when the lock is stale", () => {
    expect(
      readRunningDevServer(
        ".next/dev/lock",
        () =>
          JSON.stringify({
            pid: 11142,
            port: 3000,
            hostname: "localhost",
            appUrl: "http://localhost:3000",
            startedAt: 1776488961556,
          }),
        () => false,
      ),
    ).toBeUndefined();
  });
});

describe("findStaleWorkspaceChange", () => {
  it("returns the newest changed file when the workspace is newer than the server", () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "coin-hub-dev-lock-"));
    temporaryDirectories.push(workspaceRoot);
    mkdirSync(join(workspaceRoot, "src"), { recursive: true });
    const targetFile = join(workspaceRoot, "src/research-chart.tsx");
    writeFileSync(targetFile, "export const ok = true;\n");
    utimesSync(targetFile, 2_000, 2_000);

    expect(
      findStaleWorkspaceChange(workspaceRoot, {
        pid: 11142,
        port: 3000,
        hostname: "localhost",
        appUrl: "http://localhost:3000",
        startedAt: 1_000_000,
      }),
    ).toEqual({
      path: "src/research-chart.tsx",
      mtimeMs: 2_000_000,
    });
  });

  it("returns undefined when the running server is newer than the workspace", () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "coin-hub-dev-lock-"));
    temporaryDirectories.push(workspaceRoot);
    mkdirSync(join(workspaceRoot, "src"), { recursive: true });
    const targetFile = join(workspaceRoot, "src/research-chart.tsx");
    writeFileSync(targetFile, "export const ok = true;\n");
    utimesSync(targetFile, 1_000, 1_000);

    expect(
      findStaleWorkspaceChange(workspaceRoot, {
        pid: 11142,
        port: 3000,
        hostname: "localhost",
        appUrl: "http://localhost:3000",
        startedAt: 2_000_000,
      }),
    ).toBeUndefined();
  });
});
