-- DropIndex
DROP INDEX "RecordOutcome_planId_key";

-- CreateIndex
CREATE UNIQUE INDEX "RecordOutcome_recordId_timeframe_windowType_key" ON "RecordOutcome"("recordId", "timeframe", "windowType");

-- CreateIndex
CREATE UNIQUE INDEX "RecordOutcome_planId_timeframe_windowType_key" ON "RecordOutcome"("planId", "timeframe", "windowType");
