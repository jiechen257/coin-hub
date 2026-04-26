// @vitest-environment node

import { describe, expect, it } from "vitest";
import { resolveMockSeedRuntime } from "@/lib/mock-seed-runtime";

describe("resolveMockSeedRuntime", () => {
  it("uses local sqlite by default", () => {
    expect(resolveMockSeedRuntime({})).toMatchObject({
      target: "local",
      env: {
        DATABASE_URL: "file:./prisma/dev.db",
        LOCAL_DATABASE_URL: "file:./prisma/dev.db",
        TURSO_DATABASE_URL: "",
        TURSO_AUTH_TOKEN: "",
      },
    });
  });

  it("blocks remote mock seed unless explicitly allowed", () => {
    expect(() =>
      resolveMockSeedRuntime(
        {
          TURSO_PRODUCTION_DATABASE_URL: "libsql://coin-hub.turso.io",
          TURSO_PRODUCTION_AUTH_TOKEN: "prod-token",
        },
        "production",
      ),
    ).toThrow("Remote mock seed is blocked");
  });

  it("allows remote mock seed only with an explicit guard env", () => {
    expect(
      resolveMockSeedRuntime(
        {
          COIN_HUB_ALLOW_REMOTE_MOCK_SEED: "1",
          TURSO_PRODUCTION_DATABASE_URL: "libsql://coin-hub.turso.io",
          TURSO_PRODUCTION_AUTH_TOKEN: "prod-token",
        },
        "production",
      ),
    ).toMatchObject({
      target: "production",
      env: {
        TURSO_DATABASE_URL: "libsql://coin-hub.turso.io",
        TURSO_AUTH_TOKEN: "prod-token",
      },
    });
  });
});
