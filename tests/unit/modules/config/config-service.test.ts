// @vitest-environment node

import { saveNewConfigVersion } from "@/modules/config/config-service";
import { db } from "@/lib/db";

describe("config-service", () => {
  it("creates a new version instead of mutating the active one", async () => {
    const initial = await saveNewConfigVersion({
      summary: "initial config",
      params: { riskPct: 0.5 },
    });

    const created = await saveNewConfigVersion({
      summary: "raise confidence threshold",
      params: { riskPct: 0.7 },
    });

    const versions = await db.configVersion.findMany({
      orderBy: { createdAt: "asc" },
    });

    expect(initial.id).toBeDefined();
    expect(created.id).toBeDefined();
    expect(created.id).not.toBe(initial.id);
    expect(created.isActive).toBe(true);
    expect(created.summary).toBe("raise confidence threshold");
    expect(created.params.riskPct).toBe(0.7);

    const createdVersionIds = [initial.id, created.id];
    const createdVersions = await db.configVersion.findMany({
      where: { id: { in: createdVersionIds } },
    });

    expect(createdVersions).toHaveLength(2);
    expect(createdVersions.filter((version) => version.isActive)).toHaveLength(1);
    expect(
      createdVersions.find((version) => version.id === initial.id)?.isActive,
    ).toBe(false);
    expect(
      createdVersions.find((version) => version.id === created.id)?.isActive,
    ).toBe(true);
  });
});
