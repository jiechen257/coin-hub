// @vitest-environment node

import { createConfigVersion, getActiveConfigVersion } from "@/modules/config/config-repository";

describe("config-repository", () => {
  it("stores and returns the active strategy config version", async () => {
    await createConfigVersion({ summary: "initial", params: { riskPct: 1 } });

    const active = await getActiveConfigVersion();

    expect(active?.summary).toBe("initial");
    expect(active?.params.riskPct).toBe(1);
  });
});
