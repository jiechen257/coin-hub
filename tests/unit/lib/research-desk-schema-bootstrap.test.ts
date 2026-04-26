// @vitest-environment node

import { describe, expect, it } from "vitest";
import { buildResearchDeskSchemaStatements } from "@/lib/research-desk-schema-bootstrap";

function createSnapshot(input?: {
  tables?: string[];
  indexes?: string[];
  columnsByTable?: Record<string, string[]>;
}) {
  return {
    tables: new Set(input?.tables ?? []),
    indexes: new Set(input?.indexes ?? []),
    columnsByTable: new Map(
      Object.entries(input?.columnsByTable ?? {}).map(([table, columns]) => [
        table,
        new Set(columns),
      ]),
    ),
  };
}

describe("buildResearchDeskSchemaStatements", () => {
  it("creates the full latest research desk schema when tables are missing", () => {
    const statements = buildResearchDeskSchemaStatements(createSnapshot());

    expect(
      statements.some((statement) =>
        statement.includes('CREATE TABLE IF NOT EXISTS "TraderProfile"'),
      ),
    ).toBe(true);
    expect(
      statements.some((statement) =>
        statement.includes('CREATE TABLE IF NOT EXISTS "TraderRecord"'),
      ),
    ).toBe(true);
    expect(
      statements.some((statement) =>
        statement.includes('CREATE TABLE IF NOT EXISTS "RecordOutcome"'),
      ),
    ).toBe(true);
    expect(
      statements.some((statement) =>
        statement.includes('CREATE UNIQUE INDEX IF NOT EXISTS "RecordOutcome_planId_timeframe_windowType_key"'),
      ),
    ).toBe(true);
  });

  it("adds only the missing TraderRecord columns and indexes for legacy schema", () => {
    const statements = buildResearchDeskSchemaStatements(
      createSnapshot({
        tables: [
          "TraderProfile",
          "TraderRecord",
          "ExecutionPlan",
          "TradeSample",
          "StrategyCandidate",
          "StrategyCandidateSample",
        ],
        indexes: ["TraderRecord_symbol_occurredAt_idx", "TradeSample_planId_key"],
        columnsByTable: {
          TraderRecord: [
            "id",
            "traderId",
            "symbol",
            "timeframe",
            "recordType",
            "sourceType",
            "occurredAt",
            "rawContent",
            "notes",
            "createdAt",
            "updatedAt",
          ],
        },
      }),
    );

    expect(statements).toContain(
      'ALTER TABLE "TraderRecord" ADD COLUMN "startedAt" DATETIME',
    );
    expect(statements).toContain(
      'ALTER TABLE "TraderRecord" ADD COLUMN "endedAt" DATETIME',
    );
    expect(statements).toContain(
      'ALTER TABLE "TraderRecord" ADD COLUMN "morphology" TEXT',
    );
    expect(statements).toContain(
      'ALTER TABLE "TraderRecord" ADD COLUMN "archivedAt" DATETIME',
    );
    expect(
      statements.some((statement) =>
        statement.includes('CREATE INDEX IF NOT EXISTS "TraderRecord_archivedAt_idx"'),
      ),
    ).toBe(true);
  });

  it("returns no work when the latest research desk schema already exists", () => {
    const statements = buildResearchDeskSchemaStatements(
      createSnapshot({
        tables: [
          "TraderProfile",
          "TraderRecord",
          "ExecutionPlan",
          "TradeSample",
          "StrategyCandidate",
          "StrategyCandidateSample",
          "RecordOutcome",
          "ReviewTag",
          "RecordOutcomeReviewTag",
        ],
        indexes: [
          "TraderRecord_symbol_occurredAt_idx",
          "TraderRecord_archivedAt_idx",
          "TradeSample_planId_key",
          "ReviewTag_label_key",
          "RecordOutcome_recordId_timeframe_windowType_key",
          "RecordOutcome_planId_timeframe_windowType_key",
          "RecordOutcome_symbol_timeframe_resultLabel_idx",
        ],
        columnsByTable: {
          TraderRecord: [
            "id",
            "traderId",
            "symbol",
            "timeframe",
            "recordType",
            "sourceType",
            "occurredAt",
            "startedAt",
            "endedAt",
            "morphology",
            "rawContent",
            "notes",
            "status",
            "archiveSummary",
            "archivedAt",
            "createdAt",
            "updatedAt",
          ],
        },
      }),
    );

    expect(statements).toEqual([
      'UPDATE "TraderRecord"\n      SET\n        "startedAt" = COALESCE("startedAt", "occurredAt"),\n        "endedAt" = COALESCE("endedAt", "startedAt", "occurredAt")\n      WHERE "startedAt" IS NULL OR "endedAt" IS NULL',
      'UPDATE "TraderRecord"\n      SET "status" = \'archived\'\n      WHERE "archivedAt" IS NOT NULL',
      'UPDATE "TraderRecord"\n      SET "status" = \'ended\'\n      WHERE "archivedAt" IS NULL\n        AND "status" = \'not_started\'\n        AND "id" IN (\n          SELECT DISTINCT ep."recordId"\n          FROM "ExecutionPlan" ep\n          INNER JOIN "TradeSample" ts ON ts."planId" = ep."id"\n        )',
      'UPDATE "TraderRecord"\n      SET "status" = \'ended\'\n      WHERE "archivedAt" IS NULL\n        AND "status" = \'not_started\'\n        AND "id" IN (\n          SELECT DISTINCT ro."recordId"\n          FROM "RecordOutcome" ro\n          WHERE ro."recordId" IS NOT NULL\n            AND ro."resultLabel" IN (\'good\', \'neutral\', \'bad\')\n          UNION\n          SELECT DISTINCT ep."recordId"\n          FROM "RecordOutcome" ro\n          INNER JOIN "ExecutionPlan" ep ON ep."id" = ro."planId"\n          WHERE ro."planId" IS NOT NULL\n            AND ro."resultLabel" IN (\'good\', \'neutral\', \'bad\')\n        )',
      'UPDATE "TraderRecord"\n      SET "status" = \'in_progress\'\n      WHERE "archivedAt" IS NULL\n        AND "status" = \'not_started\'\n        AND "id" IN (\n          SELECT DISTINCT ro."recordId"\n          FROM "RecordOutcome" ro\n          WHERE ro."recordId" IS NOT NULL\n            AND ro."resultLabel" = \'pending\'\n          UNION\n          SELECT DISTINCT ep."recordId"\n          FROM "RecordOutcome" ro\n          INNER JOIN "ExecutionPlan" ep ON ep."id" = ro."planId"\n          WHERE ro."planId" IS NOT NULL\n            AND ro."resultLabel" = \'pending\'\n        )',
    ]);
  });
});
