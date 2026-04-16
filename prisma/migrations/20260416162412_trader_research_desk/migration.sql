-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AttributedViewpoint";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ConfigVersion";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Job";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ReplayJob";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RunSnapshot";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Tweet";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "TraderProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "platform" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TraderRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "traderId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "timeframe" TEXT,
    "recordType" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "rawContent" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TraderRecord_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "TraderProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExecutionPlan" (
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
    CONSTRAINT "ExecutionPlan_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "TraderRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TradeSample" (
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
    CONSTRAINT "TradeSample_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ExecutionPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StrategyCandidate" (
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
);

-- CreateTable
CREATE TABLE "StrategyCandidateSample" (
    "candidateId" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,

    PRIMARY KEY ("candidateId", "sampleId"),
    CONSTRAINT "StrategyCandidateSample_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "StrategyCandidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StrategyCandidateSample_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "TradeSample" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TraderRecord_symbol_occurredAt_idx" ON "TraderRecord"("symbol", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "TradeSample_planId_key" ON "TradeSample"("planId");
