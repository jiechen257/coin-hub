ALTER TABLE "TraderRecord" ADD COLUMN "archivedAt" DATETIME;

CREATE INDEX "TraderRecord_archivedAt_idx" ON "TraderRecord"("archivedAt");
