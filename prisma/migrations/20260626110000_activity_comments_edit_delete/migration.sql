ALTER TABLE "activityLog"
ADD COLUMN "editedAt" TIMESTAMP(3),
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedBy" TEXT;

CREATE INDEX "activityLog_deletedAt_idx" ON "activityLog"("deletedAt");