// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import {
  isProcessAlive,
  parseDevServerInfo,
  readRunningDevServer,
} from "@/lib/dev-server-lock";

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
