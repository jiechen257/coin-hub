// @vitest-environment node

process.env.DATABASE_URL = "file:./prisma/test.db";
process.env.LOCAL_DATABASE_URL = "file:./prisma/test.db";
process.env.TURSO_DATABASE_URL = "";
process.env.TURSO_AUTH_TOKEN = "";

const { GET: getTraderRecordsRoute } = await import("@/app/api/trader-records/route");
const { PATCH: patchTraderRecordRoute } = await import(
  "@/app/api/trader-records/[recordId]/route"
);
const { db } = await import("@/lib/db");

function createPatchRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createRouteContext(recordId: string) {
  return {
    params: Promise.resolve({ recordId }),
  };
}

async function cleanDatabase() {
  await db.recordOutcomeReviewTag.deleteMany();
  await db.reviewTag.deleteMany();
  await db.recordOutcome.deleteMany();
  await db.candle.deleteMany();
  await db.executionPlan.deleteMany();
  await db.traderRecord.deleteMany();
  await db.traderProfile.deleteMany();
}

async function createTraderRecord(input: {
  traderId: string;
  rawContent: string;
  status?: string;
  archivedAt?: Date | null;
  notes?: string | null;
  archiveSummary?: string | null;
}) {
  return db.traderRecord.create({
    data: {
      traderId: input.traderId,
      symbol: "BTC",
      timeframe: "1h",
      recordType: "view",
      sourceType: "manual",
      occurredAt: new Date("2026-04-20T00:00:00.000Z"),
      startedAt: new Date("2026-04-20T00:00:00.000Z"),
      endedAt: new Date("2026-04-20T01:00:00.000Z"),
      rawContent: input.rawContent,
      notes: input.notes,
      status: input.status ?? "not_started",
      archivedAt: input.archivedAt,
      archiveSummary: input.archiveSummary,
    },
  });
}

describe("trader records API lifecycle", () => {
  beforeEach(cleanDatabase);
  afterEach(cleanDatabase);

  it("lists active records by default and includes legacy archived rows in archived filters", async () => {
    const trader = await db.traderProfile.create({
      data: { name: "Trader Status List" },
    });
    const active = await createTraderRecord({
      traderId: trader.id,
      rawContent: "进行中的记录",
      status: "in_progress",
    });
    await createTraderRecord({
      traderId: trader.id,
      rawContent: "明确归档记录",
      status: "archived",
      archivedAt: new Date("2026-04-22T00:00:00.000Z"),
    });
    const legacyArchived = await createTraderRecord({
      traderId: trader.id,
      rawContent: "历史归档记录",
      status: "not_started",
      archivedAt: new Date("2026-04-21T00:00:00.000Z"),
    });

    const defaultResponse = await getTraderRecordsRoute(
      new Request("http://localhost/api/trader-records"),
    );
    const archivedResponse = await getTraderRecordsRoute(
      new Request("http://localhost/api/trader-records?status=archived"),
    );

    expect(defaultResponse.status).toBe(200);
    expect(archivedResponse.status).toBe(200);

    const defaultPayload = (await defaultResponse.json()) as {
      records: Array<{ id: string; status: string }>;
    };
    const archivedPayload = (await archivedResponse.json()) as {
      records: Array<{ id: string; status: string }>;
    };

    expect(defaultPayload.records.map((record) => record.id)).toEqual([active.id]);
    expect(archivedPayload.records.map((record) => record.id)).toEqual(
      expect.arrayContaining([legacyArchived.id]),
    );
    expect(archivedPayload.records.every((record) => record.status === "archived")).toBe(
      true,
    );
  });

  it("enforces manual status transitions and archive idempotency", async () => {
    const trader = await db.traderProfile.create({
      data: { name: "Trader Status Flow" },
    });
    const record = await createTraderRecord({
      traderId: trader.id,
      rawContent: "状态流记录",
    });

    const skippedResponse = await patchTraderRecordRoute(
      createPatchRequest(`http://localhost/api/trader-records/${record.id}`, {
        action: "set-status",
        status: "ended",
      }),
      createRouteContext(record.id),
    );
    const startedResponse = await patchTraderRecordRoute(
      createPatchRequest(`http://localhost/api/trader-records/${record.id}`, {
        action: "set-status",
        status: "in_progress",
      }),
      createRouteContext(record.id),
    );
    const endedResponse = await patchTraderRecordRoute(
      createPatchRequest(`http://localhost/api/trader-records/${record.id}`, {
        action: "set-status",
        status: "ended",
      }),
      createRouteContext(record.id),
    );
    const archivedResponse = await patchTraderRecordRoute(
      createPatchRequest(`http://localhost/api/trader-records/${record.id}`, {
        action: "archive",
      }),
      createRouteContext(record.id),
    );

    expect(skippedResponse.status).toBe(409);
    expect(startedResponse.status).toBe(200);
    expect(endedResponse.status).toBe(200);
    expect(archivedResponse.status).toBe(200);

    const archivedPayload = (await archivedResponse.json()) as {
      record: { archivedAt: string; status: string };
    };
    const secondArchiveResponse = await patchTraderRecordRoute(
      createPatchRequest(`http://localhost/api/trader-records/${record.id}`, {
        action: "archive",
      }),
      createRouteContext(record.id),
    );
    const secondArchivePayload = (await secondArchiveResponse.json()) as {
      record: { archivedAt: string; status: string };
    };

    expect(secondArchiveResponse.status).toBe(200);
    expect(secondArchivePayload.record.status).toBe("archived");
    expect(secondArchivePayload.record.archivedAt).toBe(
      archivedPayload.record.archivedAt,
    );
  });

  it("updates archive summary only for archived records and keeps notes separate", async () => {
    const trader = await db.traderProfile.create({
      data: { name: "Trader Archive Summary" },
    });
    const record = await createTraderRecord({
      traderId: trader.id,
      rawContent: "归档总结记录",
      notes: "原始备注",
    });

    const blockedResponse = await patchTraderRecordRoute(
      createPatchRequest(`http://localhost/api/trader-records/${record.id}`, {
        action: "update-archive-summary",
        archiveSummary: "提前总结",
      }),
      createRouteContext(record.id),
    );

    await patchTraderRecordRoute(
      createPatchRequest(`http://localhost/api/trader-records/${record.id}`, {
        action: "set-status",
        status: "in_progress",
      }),
      createRouteContext(record.id),
    );
    await patchTraderRecordRoute(
      createPatchRequest(`http://localhost/api/trader-records/${record.id}`, {
        action: "set-status",
        status: "ended",
      }),
      createRouteContext(record.id),
    );
    await patchTraderRecordRoute(
      createPatchRequest(`http://localhost/api/trader-records/${record.id}`, {
        action: "archive",
      }),
      createRouteContext(record.id),
    );
    const summaryResponse = await patchTraderRecordRoute(
      createPatchRequest(`http://localhost/api/trader-records/${record.id}`, {
        action: "update-archive-summary",
        archiveSummary: "归档总结",
      }),
      createRouteContext(record.id),
    );

    expect(blockedResponse.status).toBe(409);
    expect(summaryResponse.status).toBe(200);

    const summaryPayload = (await summaryResponse.json()) as {
      record: { archiveSummary: string | null; notes: string | null };
    };
    const persisted = await db.traderRecord.findUniqueOrThrow({
      where: { id: record.id },
      select: {
        archiveSummary: true,
        notes: true,
      },
    });

    expect(summaryPayload.record.archiveSummary).toBe("归档总结");
    expect(summaryPayload.record.notes).toBe("原始备注");
    expect(persisted).toEqual({
      archiveSummary: "归档总结",
      notes: "原始备注",
    });
  });
});
