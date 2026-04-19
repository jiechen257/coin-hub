// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCAL_DATABASE_URL,
  resolveDatabaseRuntimeConfig,
  resolveLocalDevelopmentEnv,
  resolvePrismaCliDatabaseUrl,
} from "@/lib/database-runtime";

describe("resolveDatabaseRuntimeConfig", () => {
  it("prefers Turso runtime config when Turso env is present", () => {
    expect(
      resolveDatabaseRuntimeConfig({
        DATABASE_URL: "file:./prisma/dev.db",
        TURSO_DATABASE_URL: "libsql://coin-hub.turso.io",
        TURSO_AUTH_TOKEN: "token-123",
      }),
    ).toEqual({
      kind: "turso",
      url: "libsql://coin-hub.turso.io",
      authToken: "token-123",
    });
  });

  it("uses local sqlite runtime config when file database url is present", () => {
    expect(
      resolveDatabaseRuntimeConfig({
        DATABASE_URL: "file:./prisma/dev.db",
      }),
    ).toEqual({
      kind: "sqlite",
      url: "file:./prisma/dev.db",
    });
  });

  it("falls back to the default local sqlite database url", () => {
    expect(resolveDatabaseRuntimeConfig({})).toEqual({
      kind: "sqlite",
      url: DEFAULT_LOCAL_DATABASE_URL,
    });
  });

  it("throws when Turso url is present without auth token", () => {
    expect(() =>
      resolveDatabaseRuntimeConfig({
        TURSO_DATABASE_URL: "libsql://coin-hub.turso.io",
      }),
    ).toThrow("TURSO_AUTH_TOKEN is required when using Turso.");
  });

  it("throws on unsupported database url schemes", () => {
    expect(() =>
      resolveDatabaseRuntimeConfig({
        DATABASE_URL: "postgresql://localhost:5432/coin_hub",
      }),
    ).toThrow("DATABASE_URL must use file: for SQLite.");
  });
});

describe("resolvePrismaCliDatabaseUrl", () => {
  it("uses LOCAL_DATABASE_URL when present", () => {
    expect(
      resolvePrismaCliDatabaseUrl({
        LOCAL_DATABASE_URL: "file:./prisma/cli.db",
        DATABASE_URL: "file:./prisma/dev.db",
      }),
    ).toBe("file:./prisma/cli.db");
  });

  it("uses DATABASE_URL when it already points to a local sqlite file", () => {
    expect(
      resolvePrismaCliDatabaseUrl({
        DATABASE_URL: "file:./prisma/dev.db",
      }),
    ).toBe("file:./prisma/dev.db");
  });

  it("falls back to the default local sqlite file when DATABASE_URL points to Turso", () => {
    expect(
      resolvePrismaCliDatabaseUrl({
        DATABASE_URL: "libsql://coin-hub.turso.io",
      }),
    ).toBe(DEFAULT_LOCAL_DATABASE_URL);
  });

  it("throws when LOCAL_DATABASE_URL is not a local sqlite file", () => {
    expect(() =>
      resolvePrismaCliDatabaseUrl({
        LOCAL_DATABASE_URL: "libsql://coin-hub.turso.io",
      }),
    ).toThrow("LOCAL_DATABASE_URL must use file: for SQLite.");
  });
});

describe("resolveLocalDevelopmentEnv", () => {
  it("forces local sqlite env for development server startup", () => {
    expect(
      resolveLocalDevelopmentEnv({
        DATABASE_URL: "file:./prisma/dev.db",
        LOCAL_DATABASE_URL: "file:./prisma/local-dev.db",
        TURSO_DATABASE_URL: "libsql://coin-hub.turso.io",
        TURSO_AUTH_TOKEN: "token-123",
        NEXT_RUNTIME: "nodejs",
      }),
    ).toEqual({
      DATABASE_URL: "file:./prisma/local-dev.db",
      LOCAL_DATABASE_URL: "file:./prisma/local-dev.db",
      TURSO_DATABASE_URL: "",
      TURSO_AUTH_TOKEN: "",
      NEXT_RUNTIME: "nodejs",
    });
  });

  it("falls back to the default local sqlite database when no local url exists", () => {
    expect(
      resolveLocalDevelopmentEnv({
        DATABASE_URL: "libsql://coin-hub.turso.io",
      }),
    ).toEqual({
      DATABASE_URL: DEFAULT_LOCAL_DATABASE_URL,
      LOCAL_DATABASE_URL: DEFAULT_LOCAL_DATABASE_URL,
      TURSO_DATABASE_URL: "",
      TURSO_AUTH_TOKEN: "",
    });
  });
});
