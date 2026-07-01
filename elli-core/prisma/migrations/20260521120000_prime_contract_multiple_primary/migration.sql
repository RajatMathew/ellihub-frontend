ALTER TABLE "PrimeContract" ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false;

UPDATE "PrimeContract" SET "isPrimary" = true;

DROP INDEX "PrimeContract_projectId_key";

CREATE UNIQUE INDEX "PrimeContract_projectId_fileId_key" ON "PrimeContract"("projectId", "fileId");
CREATE INDEX "PrimeContract_projectId_isPrimary_idx" ON "PrimeContract"("projectId", "isPrimary");

CREATE UNIQUE INDEX "PrimeContract_primary_project_unique"
    ON "PrimeContract"("projectId")
    WHERE "isPrimary" = true;

UPDATE "File"
SET "isDeletable" = false
WHERE "id" IN (SELECT "fileId" FROM "PrimeContract");
