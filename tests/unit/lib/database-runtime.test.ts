// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCAL_DATABASE_URL,
  resolveDatabaseRuntimeConfig,
  resolveLocalDevelopmentEnv,
  resolveLocalDevelopmentTarget,
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

  it("ignores local daily and production turso sources", () => {
    expect(
      resolvePrismaCliDatabaseUrl({
        LOCAL_DATABASE_URL: "file:./prisma/cli.db",
        TURSO_DAILY_DATABASE_URL: "libsql://coin-hub-daily.turso.io",
        TURSO_DAILY_AUTH_TOKEN: "daily-token",
        TURSO_PRODUCTION_DATABASE_URL: "libsql://coin-hub.turso.io",
        TURSO_PRODUCTION_AUTH_TOKEN: "prod-token",
      }),
    ).toBe("file:./prisma/cli.db");
  });
});

describe("resolveLocalDevelopmentTarget", () => {
  it("defaults to daily when no target override exists", () => {
    expect(resolveLocalDevelopmentTarget({})).toBe("daily");
  });

  it("uses COIN_HUB_DEV_DATABASE_TARGET when present", () => {
    expect(
      resolveLocalDevelopmentTarget({
        COIN_HUB_DEV_DATABASE_TARGET: "production",
      }),
    ).toBe("production");
  });

  it("prefers the explicit target override over env", () => {
    expect(
      resolveLocalDevelopmentTarget(
        {
          COIN_HUB_DEV_DATABASE_TARGET: "daily",
        },
        "local",
      ),
    ).toBe("local");
  });

  it("throws on invalid target override values", () => {
    expect(() => resolveLocalDevelopmentTarget({}, "staging")).toThrow(
      "--target must be one of daily, production, local.",
    );
  });

  it("throws on invalid env target values", () => {
    expect(() =>
      resolveLocalDevelopmentTarget({
        COIN_HUB_DEV_DATABASE_TARGET: "staging",
      }),
    ).toThrow("COIN_HUB_DEV_DATABASE_TARGET must be one of daily, production, local.");
  });
});

describe("resolveLocalDevelopmentEnv", () => {
  it("maps the daily turso source into canonical runtime env", () => {
    expect(
      resolveLocalDevelopmentEnv({
        LOCAL_DATABASE_URL: "file:./prisma/local-dev.db",
        TURSO_DAILY_DATABASE_URL: "libsql://coin-hub-daily.turso.io",
        TURSO_DAILY_AUTH_TOKEN: "daily-token",
        TURSO_PRODUCTION_DATABASE_URL: "libsql://coin-hub.turso.io",
        TURSO_PRODUCTION_AUTH_TOKEN: "prod-token",
        NEXT_RUNTIME: "nodejs",
      }),
    ).toMatchObject({
      DATABASE_URL: "file:./prisma/local-dev.db",
      LOCAL_DATABASE_URL: "file:./prisma/local-dev.db",
      TURSO_DATABASE_URL: "libsql://coin-hub-daily.turso.io",
      TURSO_AUTH_TOKEN: "daily-token",
      NEXT_RUNTIME: "nodejs",
    });
  });

  it("maps the production turso source when production is selected", () => {
    expect(
      resolveLocalDevelopmentEnv(
        {
          LOCAL_DATABASE_URL: "file:./prisma/local-dev.db",
          TURSO_DAILY_DATABASE_URL: "libsql://coin-hub-daily.turso.io",
          TURSO_DAILY_AUTH_TOKEN: "daily-token",
          TURSO_PRODUCTION_DATABASE_URL: "libsql://coin-hub.turso.io",
          TURSO_PRODUCTION_AUTH_TOKEN: "prod-token",
        },
        "production",
      ),
    ).toMatchObject({
      DATABASE_URL: "file:./prisma/local-dev.db",
      LOCAL_DATABASE_URL: "file:./prisma/local-dev.db",
      TURSO_DATABASE_URL: "libsql://coin-hub.turso.io",
      TURSO_AUTH_TOKEN: "prod-token",
    });
  });

  it("forces local sqlite env when local is selected", () => {
    expect(
      resolveLocalDevelopmentEnv(
        {
          DATABASE_URL: "file:./prisma/dev.db",
          LOCAL_DATABASE_URL: "file:./prisma/local-dev.db",
          TURSO_DAILY_DATABASE_URL: "libsql://coin-hub-daily.turso.io",
          TURSO_DAILY_AUTH_TOKEN: "daily-token",
          NEXT_RUNTIME: "nodejs",
        },
        "local",
      ),
    ).toMatchObject({
      DATABASE_URL: "file:./prisma/local-dev.db",
      LOCAL_DATABASE_URL: "file:./prisma/local-dev.db",
      TURSO_DATABASE_URL: "",
      TURSO_AUTH_TOKEN: "",
      NEXT_RUNTIME: "nodejs",
    });
  });

  it("falls back to the default local sqlite database when no local url exists", () => {
    expect(
      resolveLocalDevelopmentEnv(
        {
          TURSO_DAILY_DATABASE_URL: "libsql://coin-hub-daily.turso.io",
          TURSO_DAILY_AUTH_TOKEN: "daily-token",
        },
        "local",
      ),
    ).toMatchObject({
      DATABASE_URL: DEFAULT_LOCAL_DATABASE_URL,
      LOCAL_DATABASE_URL: DEFAULT_LOCAL_DATABASE_URL,
      TURSO_DATABASE_URL: "",
      TURSO_AUTH_TOKEN: "",
    });
  });

  it("throws when the selected daily turso source is incomplete", () => {
    expect(() =>
      resolveLocalDevelopmentEnv({
        TURSO_DAILY_DATABASE_URL: "libsql://coin-hub-daily.turso.io",
      }),
    ).toThrow("TURSO_DAILY_AUTH_TOKEN is required when target=daily.");
  });

  it("throws when the selected production turso source is incomplete", () => {
    expect(() =>
      resolveLocalDevelopmentEnv(
        {
          TURSO_PRODUCTION_AUTH_TOKEN: "prod-token",
        },
        "production",
      ),
    ).toThrow("TURSO_PRODUCTION_DATABASE_URL is required when target=production.");
  });
});
