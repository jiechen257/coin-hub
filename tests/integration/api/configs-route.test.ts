// @vitest-environment node

import { db } from "@/lib/db";
import { GET, POST } from "@/app/api/configs/route";
import { POST as activateVersion } from "@/app/api/configs/[versionId]/activate/route";

describe("configs api", () => {
  it("creates and lists config versions", async () => {
    const createResponse = await POST(
      new Request("http://localhost/api/configs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: "raise confidence threshold",
          params: { riskPct: 0.7 },
        }),
      }),
    );

    expect(createResponse.status).toBe(201);

    const createPayload = (await createResponse.json()) as {
      version: { id: string; isActive: boolean; summary: string };
    };

    expect(createPayload.version.isActive).toBe(true);

    const secondCreateResponse = await POST(
      new Request("http://localhost/api/configs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: "tighten confidence threshold",
          params: { riskPct: 0.9 },
        }),
      }),
    );

    expect(secondCreateResponse.status).toBe(201);

    const secondCreatePayload = (await secondCreateResponse.json()) as {
      version: { id: string; isActive: boolean; summary: string };
    };

    expect(secondCreatePayload.version.id).not.toBe(createPayload.version.id);
    expect(secondCreatePayload.version.isActive).toBe(true);

    const listResponse = await GET();
    expect(listResponse.status).toBe(200);

    const listPayload = (await listResponse.json()) as {
      currentVersion: { id: string } | null;
      versions: Array<{ id: string; isActive: boolean }>;
    };

    expect(listPayload.currentVersion?.id).toBe(secondCreatePayload.version.id);
    const createdVersionIds = [createPayload.version.id, secondCreatePayload.version.id];
    const listedCreatedVersions = listPayload.versions.filter((version) =>
      createdVersionIds.includes(version.id),
    );

    expect(listedCreatedVersions).toHaveLength(2);
    expect(listedCreatedVersions.filter((version) => version.isActive)).toHaveLength(1);
    expect(
      listedCreatedVersions.find((version) => version.id === createPayload.version.id)
        ?.isActive,
    ).toBe(false);
    expect(
      listedCreatedVersions.find(
        (version) => version.id === secondCreatePayload.version.id,
      )?.isActive,
    ).toBe(true);

    const persistedVersions = await db.configVersion.findMany({
      where: { id: { in: createdVersionIds } },
    });

    expect(persistedVersions).toHaveLength(2);
    expect(persistedVersions.filter((version) => version.isActive)).toHaveLength(1);
  });

  it("activates an existing config version", async () => {
    const olderResponse = await POST(
      new Request("http://localhost/api/configs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: "older config",
          params: { riskPct: 0.5 },
        }),
      }),
    );

    const olderPayload = (await olderResponse.json()) as {
      version: { id: string };
    };

    const newerResponse = await POST(
      new Request("http://localhost/api/configs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: "newer config",
          params: { riskPct: 0.8 },
        }),
      }),
    );

    const newerPayload = (await newerResponse.json()) as {
      version: { id: string; isActive: boolean };
    };

    expect(newerPayload.version.isActive).toBe(true);

    const activateResponse = await activateVersion(
      new Request(
        "http://localhost/api/configs/" + olderPayload.version.id + "/activate",
        {
          method: "POST",
        },
      ),
      {
        params: Promise.resolve({ versionId: olderPayload.version.id }),
      },
    );

    expect(activateResponse.status).toBe(200);

    const payload = (await activateResponse.json()) as {
      version: { id: string; isActive: boolean };
    };

    expect(payload.version.id).toBe(olderPayload.version.id);
    expect(payload.version.isActive).toBe(true);

    const current = await GET();
    const currentPayload = (await current.json()) as {
      currentVersion: { id: string } | null;
      versions: Array<{ id: string; isActive: boolean }>;
    };

    expect(currentPayload.currentVersion?.id).toBe(olderPayload.version.id);
    const createdVersionIds = [olderPayload.version.id, newerPayload.version.id];
    const currentCreatedVersions = currentPayload.versions.filter((version) =>
      createdVersionIds.includes(version.id),
    );

    expect(currentCreatedVersions).toHaveLength(2);
    expect(currentCreatedVersions.filter((version) => version.isActive)).toHaveLength(1);
    expect(
      currentCreatedVersions.find((version) => version.id === olderPayload.version.id)
        ?.isActive,
    ).toBe(true);
    expect(
      currentCreatedVersions.find((version) => version.id === newerPayload.version.id)
        ?.isActive,
    ).toBe(false);
  });
});
