ALTER TYPE "EmailSyncStatus" ADD VALUE IF NOT EXISTS 'PARTIAL';

ALTER TABLE "EmailSyncState"
    ADD COLUMN "syncUpdatedPageToken" TEXT,
    ADD COLUMN "syncUpdatedNextToken" TEXT,
    ADD COLUMN "syncDeletedPageToken" TEXT,
    ADD COLUMN "syncDeletedNextToken" TEXT,
    ADD COLUMN "lastSyncErrorCode" TEXT,
    ADD COLUMN "consecutiveFailures" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "EmailMessageCache" ADD COLUMN "conversationKey" TEXT;

UPDATE "EmailMessageCache"
SET "conversationKey" = COALESCE(NULLIF("threadId", ''), "providerId")
WHERE "conversationKey" IS NULL;

ALTER TABLE "EmailMessageCache" ALTER COLUMN "conversationKey" SET NOT NULL;

CREATE INDEX "EmailMessageCache_accountId_folderId_deletedAt_receivedAt_idx"
    ON "EmailMessageCache"("accountId", "folderId", "deletedAt", "receivedAt" DESC);

CREATE INDEX "EmailMessageCache_accountId_conversationKey_deletedAt_receivedAt_idx"
    ON "EmailMessageCache"("accountId", "conversationKey", "deletedAt", "receivedAt" DESC);

CREATE TABLE "EmailTagCache" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "source" TEXT NOT NULL DEFAULT 'provider',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmailTagCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailTagCache_accountId_providerId_key"
    ON "EmailTagCache"("accountId", "providerId");
CREATE INDEX "EmailTagCache_accountId_name_idx"
    ON "EmailTagCache"("accountId", "name");
ALTER TABLE "EmailTagCache" ADD CONSTRAINT "EmailTagCache_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "EmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
