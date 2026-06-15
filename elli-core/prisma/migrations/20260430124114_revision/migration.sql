-- CreateEnum
CREATE TYPE "RevisionEntityType" AS ENUM ('RFQ', 'PURCHASE_ORDER', 'SUB_CHANGE_ORDER', 'INVOICE', 'PROJECT');

-- CreateTable
CREATE TABLE "revision" (
    "id" TEXT NOT NULL,
    "entityType" "RevisionEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changeNote" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "revision_entityType_entityId_createdAt_idx" ON "revision"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "revision_entityType_entityId_version_key" ON "revision"("entityType", "entityId", "version");

-- AddForeignKey
ALTER TABLE "revision" ADD CONSTRAINT "revision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
