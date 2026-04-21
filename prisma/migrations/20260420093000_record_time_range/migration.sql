ALTER TABLE "TraderRecord" ADD COLUMN "startedAt" DATETIME;

ALTER TABLE "TraderRecord" ADD COLUMN "endedAt" DATETIME;

UPDATE "TraderRecord"
SET
  "startedAt" = "occurredAt",
  "endedAt" = "occurredAt"
WHERE "startedAt" IS NULL
   OR "endedAt" IS NULL;
