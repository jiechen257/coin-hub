-- CreateTable
CREATE TABLE "RecordOutcome" (
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
    CONSTRAINT "RecordOutcome_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "TraderRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecordOutcome_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ExecutionPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "RecordOutcomeReviewTag" (
    "outcomeId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    PRIMARY KEY ("outcomeId", "tagId"),
    CONSTRAINT "RecordOutcomeReviewTag_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "RecordOutcome" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecordOutcomeReviewTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ReviewTag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RecordOutcome_planId_key" ON "RecordOutcome"("planId");

-- CreateIndex
CREATE INDEX "RecordOutcome_symbol_timeframe_resultLabel_idx" ON "RecordOutcome"("symbol", "timeframe", "resultLabel");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewTag_label_key" ON "ReviewTag"("label");
