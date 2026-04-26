ALTER TABLE "TraderRecord" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'not_started';
ALTER TABLE "TraderRecord" ADD COLUMN "archiveSummary" TEXT;

UPDATE "TraderRecord"
SET "status" = 'archived'
WHERE "archivedAt" IS NOT NULL;

UPDATE "TraderRecord"
SET "status" = 'ended'
WHERE "archivedAt" IS NULL
  AND "id" IN (
    SELECT DISTINCT ep."recordId"
    FROM "ExecutionPlan" ep
    INNER JOIN "TradeSample" ts ON ts."planId" = ep."id"
  );

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
  );

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
  );
