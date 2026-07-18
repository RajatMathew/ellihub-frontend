-- CreateEnum
CREATE TYPE "SentEmailStatus" AS ENUM ('SENT', 'FAILED');

-- CreateTable
CREATE TABLE "SentEmailLog" (
    "id" TEXT NOT NULL,
    "feature" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'microsoftGraph',
    "from" TEXT NOT NULL,
    "to" TEXT[] NOT NULL,
    "cc" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "bcc" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "status" "SentEmailStatus" NOT NULL,
    "providerStatus" INTEGER,
    "providerResponse" JSONB,
    "error" TEXT,
    "attachments" JSONB NOT NULL,
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SentEmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SentEmailLog_entityType_entityId_sentAt_idx" ON "SentEmailLog"("entityType", "entityId", "sentAt" DESC);

-- CreateIndex
CREATE INDEX "SentEmailLog_relatedEntityType_relatedEntityId_sentAt_idx" ON "SentEmailLog"("relatedEntityType", "relatedEntityId", "sentAt" DESC);

-- CreateIndex
CREATE INDEX "SentEmailLog_feature_sentAt_idx" ON "SentEmailLog"("feature", "sentAt" DESC);

-- CreateIndex
CREATE INDEX "SentEmailLog_status_createdAt_idx" ON "SentEmailLog"("status", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "SentEmailLog" ADD CONSTRAINT "SentEmailLog_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
