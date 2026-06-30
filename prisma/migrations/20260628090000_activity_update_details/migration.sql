ALTER TABLE "activityLog"
ADD COLUMN "revision" INTEGER,
ADD COLUMN "details" JSONB;

CREATE INDEX "activityLog_entityType_entityId_revision_idx"
ON "activityLog"("entityType", "entityId", "revision");

WITH numbered_updates AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "entityType", "entityId"
            ORDER BY "createdAt" ASC, "id" ASC
        ) AS "revision"
    FROM "activityLog"
    WHERE "action" = 'update'
      AND "description" ILIKE 'Updated %'
)
UPDATE "activityLog" log
SET "revision" = numbered_updates."revision"
FROM numbered_updates
WHERE log."id" = numbered_updates."id";