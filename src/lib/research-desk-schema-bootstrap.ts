import { db } from "@/lib/db";
import { resolveDatabaseRuntimeConfig } from "@/lib/database-runtime";

type SchemaSnapshot = {
  tables: Set<string>;
  columnsByTable: Map<string, Set<string>>;
  indexes: Set<string>;
};

declare global {
  var __coinHubResearchDeskSchemaBootstrap__: Promise<void> | undefined;
}

const RESEARCH_DESK_TABLES = [
  "TraderProfile",
  "TraderRecord",
  "ExecutionPlan",
  "TradeSample",
  "StrategyCandidate",
  "StrategyCandidateSample",
  "RecordOutcome",
  "ReviewTag",
  "RecordOutcomeReviewTag",
] as const;

function isCloudSqliteRuntime() {
  return resolveDatabaseRuntimeConfig(process.env).kind === "turso";
}

function hasColumn(snapshot: SchemaSnapshot, table: string, column: string) {
  return snapshot.columnsByTable.get(table)?.has(column) ?? false;
}

export function buildResearchDeskSchemaStatements(snapshot: SchemaSnapshot) {
  const statements: string[] = [];

  if (!snapshot.tables.has("TraderProfile")) {
    statements.push(`
      CREATE TABLE IF NOT EXISTS "TraderProfile" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "platform" TEXT,
        "notes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )
    `);
  }

  if (!snapshot.tables.has("TraderRecord")) {
    statements.push(`
      CREATE TABLE IF NOT EXISTS "TraderRecord" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "traderId" TEXT NOT NULL,
        "symbol" TEXT NOT NULL,
        "timeframe" TEXT,
        "recordType" TEXT NOT NULL,
        "sourceType" TEXT NOT NULL,
        "occurredAt" DATETIME NOT NULL,
        "startedAt" DATETIME,
        "endedAt" DATETIME,
        "morphology" TEXT,
        "rawContent" TEXT NOT NULL,
        "notes" TEXT,
        "status" TEXT NOT NULL DEFAULT 'not_started',
        "archiveSummary" TEXT,
        "archivedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "TraderRecord_traderId_fkey"
          FOREIGN KEY ("traderId") REFERENCES "TraderProfile" ("id")
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
  } else {
    if (!hasColumn(snapshot, "TraderRecord", "startedAt")) {
      statements.push(`ALTER TABLE "TraderRecord" ADD COLUMN "startedAt" DATETIME`);
    }

    if (!hasColumn(snapshot, "TraderRecord", "endedAt")) {
      statements.push(`ALTER TABLE "TraderRecord" ADD COLUMN "endedAt" DATETIME`);
    }

    if (!hasColumn(snapshot, "TraderRecord", "morphology")) {
      statements.push(`ALTER TABLE "TraderRecord" ADD COLUMN "morphology" TEXT`);
    }

    if (!hasColumn(snapshot, "TraderRecord", "archivedAt")) {
      statements.push(`ALTER TABLE "TraderRecord" ADD COLUMN "archivedAt" DATETIME`);
    }

    if (!hasColumn(snapshot, "TraderRecord", "status")) {
      statements.push(
        `ALTER TABLE "TraderRecord" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'not_started'`,
      );
    }

    if (!hasColumn(snapshot, "TraderRecord", "archiveSummary")) {
      statements.push(`ALTER TABLE "TraderRecord" ADD COLUMN "archiveSummary" TEXT`);
    }
  }

  if (!snapshot.tables.has("ExecutionPlan")) {
    statements.push(`
      CREATE TABLE IF NOT EXISTS "ExecutionPlan" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "recordId" TEXT NOT NULL,
        "label" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'draft',
        "side" TEXT NOT NULL,
        "entryPrice" REAL,
        "exitPrice" REAL,
        "stopLoss" REAL,
        "takeProfit" REAL,
        "marketContext" TEXT,
        "triggerText" TEXT NOT NULL,
        "entryText" TEXT NOT NULL,
        "riskText" TEXT,
        "exitText" TEXT,
        "notes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "ExecutionPlan_recordId_fkey"
          FOREIGN KEY ("recordId") REFERENCES "TraderRecord" ("id")
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
  }

  if (!snapshot.tables.has("TradeSample")) {
    statements.push(`
      CREATE TABLE IF NOT EXISTS "TradeSample" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "planId" TEXT NOT NULL,
        "settledAt" DATETIME NOT NULL,
        "entryPrice" REAL NOT NULL,
        "exitPrice" REAL NOT NULL,
        "pnlValue" REAL NOT NULL,
        "pnlPercent" REAL NOT NULL,
        "holdingMinutes" INTEGER NOT NULL,
        "maxDrawdownPercent" REAL,
        "resultTag" TEXT NOT NULL,
        "notes" TEXT,
        CONSTRAINT "TradeSample_planId_fkey"
          FOREIGN KEY ("planId") REFERENCES "ExecutionPlan" ("id")
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
  }

  if (!snapshot.tables.has("StrategyCandidate")) {
    statements.push(`
      CREATE TABLE IF NOT EXISTS "StrategyCandidate" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "marketContext" TEXT,
        "triggerText" TEXT NOT NULL,
        "entryText" TEXT NOT NULL,
        "riskText" TEXT,
        "exitText" TEXT,
        "sampleCount" INTEGER NOT NULL,
        "winRate" REAL NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
      )
    `);
  }

  if (!snapshot.tables.has("StrategyCandidateSample")) {
    statements.push(`
      CREATE TABLE IF NOT EXISTS "StrategyCandidateSample" (
        "candidateId" TEXT NOT NULL,
        "sampleId" TEXT NOT NULL,
        PRIMARY KEY ("candidateId", "sampleId"),
        CONSTRAINT "StrategyCandidateSample_candidateId_fkey"
          FOREIGN KEY ("candidateId") REFERENCES "StrategyCandidate" ("id")
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "StrategyCandidateSample_sampleId_fkey"
          FOREIGN KEY ("sampleId") REFERENCES "TradeSample" ("id")
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
  }

  if (!snapshot.tables.has("RecordOutcome")) {
    statements.push(`
      CREATE TABLE IF NOT EXISTS "RecordOutcome" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "recordId" TEXT,
        "planId" TEXT,
        "symbol" TEXT NOT NULL,
        "timeframe" TEXT NOT NULL,
        "windowType" TEXT NOT NULL,
        "windowStartAt" DATETIME NOT NULL,
        "windowEndAt" DATETIME NOT NULL,
        "resultLabel" TEXT NOT NULL,
        "resultReason" TEXT NOT NULL,
        "forwardReturnPercent" REAL,
        "maxFavorableExcursionPercent" REAL,
        "maxAdverseExcursionPercent" REAL,
        "ruleVersion" TEXT NOT NULL,
        "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "RecordOutcome_recordId_fkey"
          FOREIGN KEY ("recordId") REFERENCES "TraderRecord" ("id")
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "RecordOutcome_planId_fkey"
          FOREIGN KEY ("planId") REFERENCES "ExecutionPlan" ("id")
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
  }

  if (!snapshot.tables.has("ReviewTag")) {
    statements.push(`
      CREATE TABLE IF NOT EXISTS "ReviewTag" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "label" TEXT NOT NULL,
        "kind" TEXT NOT NULL
      )
    `);
  }

  if (!snapshot.tables.has("RecordOutcomeReviewTag")) {
    statements.push(`
      CREATE TABLE IF NOT EXISTS "RecordOutcomeReviewTag" (
        "outcomeId" TEXT NOT NULL,
        "tagId" TEXT NOT NULL,
        PRIMARY KEY ("outcomeId", "tagId"),
        CONSTRAINT "RecordOutcomeReviewTag_outcomeId_fkey"
          FOREIGN KEY ("outcomeId") REFERENCES "RecordOutcome" ("id")
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "RecordOutcomeReviewTag_tagId_fkey"
          FOREIGN KEY ("tagId") REFERENCES "ReviewTag" ("id")
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
  }

  if (snapshot.tables.has("TraderRecord") || statements.some((item) => item.includes(`"TraderRecord"`))) {
    statements.push(`
      UPDATE "TraderRecord"
      SET
        "startedAt" = COALESCE("startedAt", "occurredAt"),
        "endedAt" = COALESCE("endedAt", "startedAt", "occurredAt")
      WHERE "startedAt" IS NULL OR "endedAt" IS NULL
    `);

    statements.push(`
      UPDATE "TraderRecord"
      SET "status" = 'archived'
      WHERE "archivedAt" IS NOT NULL
    `);

    statements.push(`
      UPDATE "TraderRecord"
      SET "status" = 'ended'
      WHERE "archivedAt" IS NULL
        AND "status" = 'not_started'
        AND "id" IN (
          SELECT DISTINCT ep."recordId"
          FROM "ExecutionPlan" ep
          INNER JOIN "TradeSample" ts ON ts."planId" = ep."id"
        )
    `);

    statements.push(`
      UPDATE "TraderRecord"
      SET "status" = 'ended'
      WHERE "archivedAt" IS NULL
        AND "status" = 'not_started'
        AND "id" IN (
          SELECT DISTINCT ro."recordId"
          FROM "RecordOutcome" ro
          WHERE ro."recordId" IS NOT NULL
            AND ro."resultLabel" IN ('good', 'neutral', 'bad')
          UNION
          SELECT DISTINCT ep."recordId"
          FROM "RecordOutcome" ro
          INNER JOIN "ExecutionPlan" ep ON ep."id" = ro."planId"
          WHERE ro."planId" IS NOT NULL
            AND ro."resultLabel" IN ('good', 'neutral', 'bad')
        )
    `);

    statements.push(`
      UPDATE "TraderRecord"
      SET "status" = 'in_progress'
      WHERE "archivedAt" IS NULL
        AND "status" = 'not_started'
        AND "id" IN (
          SELECT DISTINCT ro."recordId"
          FROM "RecordOutcome" ro
          WHERE ro."recordId" IS NOT NULL
            AND ro."resultLabel" = 'pending'
          UNION
          SELECT DISTINCT ep."recordId"
          FROM "RecordOutcome" ro
          INNER JOIN "ExecutionPlan" ep ON ep."id" = ro."planId"
          WHERE ro."planId" IS NOT NULL
            AND ro."resultLabel" = 'pending'
        )
    `);
  }

  if (!snapshot.indexes.has("TraderRecord_symbol_occurredAt_idx")) {
    statements.push(`
      CREATE INDEX IF NOT EXISTS "TraderRecord_symbol_occurredAt_idx"
      ON "TraderRecord"("symbol", "occurredAt")
    `);
  }

  if (!snapshot.indexes.has("TraderRecord_archivedAt_idx")) {
    statements.push(`
      CREATE INDEX IF NOT EXISTS "TraderRecord_archivedAt_idx"
      ON "TraderRecord"("archivedAt")
    `);
  }

  if (!snapshot.indexes.has("TradeSample_planId_key")) {
    statements.push(`
      CREATE UNIQUE INDEX IF NOT EXISTS "TradeSample_planId_key"
      ON "TradeSample"("planId")
    `);
  }

  if (!snapshot.indexes.has("ReviewTag_label_key")) {
    statements.push(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ReviewTag_label_key"
      ON "ReviewTag"("label")
    `);
  }

  if (!snapshot.indexes.has("RecordOutcome_recordId_timeframe_windowType_key")) {
    statements.push(`
      CREATE UNIQUE INDEX IF NOT EXISTS "RecordOutcome_recordId_timeframe_windowType_key"
      ON "RecordOutcome"("recordId", "timeframe", "windowType")
    `);
  }

  if (!snapshot.indexes.has("RecordOutcome_planId_timeframe_windowType_key")) {
    statements.push(`
      CREATE UNIQUE INDEX IF NOT EXISTS "RecordOutcome_planId_timeframe_windowType_key"
      ON "RecordOutcome"("planId", "timeframe", "windowType")
    `);
  }

  if (!snapshot.indexes.has("RecordOutcome_symbol_timeframe_resultLabel_idx")) {
    statements.push(`
      CREATE INDEX IF NOT EXISTS "RecordOutcome_symbol_timeframe_resultLabel_idx"
      ON "RecordOutcome"("symbol", "timeframe", "resultLabel")
    `);
  }

  return statements.map((statement) => statement.trim()).filter(Boolean);
}

async function readSchemaSnapshot(): Promise<SchemaSnapshot> {
  const tableRows = await db.$queryRawUnsafe<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type = 'table'",
  );
  const indexRows = await db.$queryRawUnsafe<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type = 'index'",
  );
  const tables = new Set(tableRows.map((row) => row.name));
  const columnsByTable = new Map<string, Set<string>>();

  for (const table of RESEARCH_DESK_TABLES) {
    if (!tables.has(table)) {
      columnsByTable.set(table, new Set());
      continue;
    }

    const columnRows = await db.$queryRawUnsafe<Array<{ name: string }>>(
      `SELECT name FROM pragma_table_info('${table}')`,
    );
    columnsByTable.set(
      table,
      new Set(columnRows.map((row) => row.name)),
    );
  }

  return {
    tables,
    columnsByTable,
    indexes: new Set(indexRows.map((row) => row.name)),
  };
}

async function runBootstrap() {
  const snapshot = await readSchemaSnapshot();
  const statements = buildResearchDeskSchemaStatements(snapshot);

  for (const statement of statements) {
    await db.$executeRawUnsafe(statement);
  }
}

export async function ensureResearchDeskSchema() {
  if (!isCloudSqliteRuntime()) {
    return;
  }

  globalThis.__coinHubResearchDeskSchemaBootstrap__ ??= runBootstrap().catch(
    (error) => {
      globalThis.__coinHubResearchDeskSchemaBootstrap__ = undefined;
      throw error;
    },
  );

  await globalThis.__coinHubResearchDeskSchemaBootstrap__;
}
