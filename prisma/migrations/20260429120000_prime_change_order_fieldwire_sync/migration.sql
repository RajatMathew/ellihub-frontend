-- CreateEnum
CREATE TYPE "FieldwireSyncStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "PrimeChangeOrderSyncTrigger" AS ENUM ('MANUAL', 'SCHEDULED');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "fieldwireProjectId" TEXT;

-- CreateTable
CREATE TABLE "PrimeChangeOrder" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fieldwireId" TEXT NOT NULL,
    "creatorUserId" INTEGER NOT NULL,
    "lastEditorUserId" INTEGER NOT NULL,
    "fieldwireProjectId" TEXT NOT NULL,
    "fieldwireCreatedAt" TIMESTAMP(3) NOT NULL,
    "fieldwireUpdatedAt" TIMESTAMP(3) NOT NULL,
    "deviceCreatedAt" TIMESTAMP(3) NOT NULL,
    "deviceUpdatedAt" TIMESTAMP(3) NOT NULL,
    "fieldwireDeletedAt" TIMESTAMP(3),
    "referenceNumber" TEXT,
    "name" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "pmGroupNumber" INTEGER,
    "totalCost" DECIMAL(15,2),
    "revisionId" TEXT NOT NULL,
    "statusName" TEXT NOT NULL,
    "description" TEXT,
    "assigneeUserId" INTEGER,
    "externalAssigneeUserId" INTEGER,
    "scheduleImpact" TEXT,
    "scheduleImpactDays" INTEGER,
    "currentRevisionId" TEXT NOT NULL,
    "reasonTypeId" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrimeChangeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrimeChangeOrderSyncStatus" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncStatus" "FieldwireSyncStatus",
    "lastSyncError" TEXT,
    "totalReceived" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "deletedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrimeChangeOrderSyncStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrimeChangeOrderSyncRun" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "trigger" "PrimeChangeOrderSyncTrigger" NOT NULL,
    "status" "FieldwireSyncStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "totalReceived" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "deletedCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "userId" TEXT,

    CONSTRAINT "PrimeChangeOrderSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_fieldwireProjectId_key" ON "Project"("fieldwireProjectId");

-- CreateIndex
CREATE INDEX "Project_fieldwireProjectId_idx" ON "Project"("fieldwireProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "PrimeChangeOrder_fieldwireId_key" ON "PrimeChangeOrder"("fieldwireId");

-- CreateIndex
CREATE INDEX "PrimeChangeOrder_projectId_idx" ON "PrimeChangeOrder"("projectId");

-- CreateIndex
CREATE INDEX "PrimeChangeOrder_statusName_idx" ON "PrimeChangeOrder"("statusName");

-- CreateIndex
CREATE INDEX "PrimeChangeOrder_fieldwireUpdatedAt_idx" ON "PrimeChangeOrder"("fieldwireUpdatedAt");

-- CreateIndex
CREATE INDEX "PrimeChangeOrder_deletedAt_idx" ON "PrimeChangeOrder"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PrimeChangeOrderSyncStatus_projectId_key" ON "PrimeChangeOrderSyncStatus"("projectId");

-- CreateIndex
CREATE INDEX "PrimeChangeOrderSyncStatus_lastSyncStatus_idx" ON "PrimeChangeOrderSyncStatus"("lastSyncStatus");

-- CreateIndex
CREATE INDEX "PrimeChangeOrderSyncRun_projectId_startedAt_idx" ON "PrimeChangeOrderSyncRun"("projectId", "startedAt");

-- CreateIndex
CREATE INDEX "PrimeChangeOrderSyncRun_status_idx" ON "PrimeChangeOrderSyncRun"("status");

-- CreateIndex
CREATE INDEX "PrimeChangeOrderSyncRun_userId_idx" ON "PrimeChangeOrderSyncRun"("userId");

-- AddForeignKey
ALTER TABLE "PrimeChangeOrder" ADD CONSTRAINT "PrimeChangeOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrimeChangeOrderSyncStatus" ADD CONSTRAINT "PrimeChangeOrderSyncStatus_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrimeChangeOrderSyncRun" ADD CONSTRAINT "PrimeChangeOrderSyncRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrimeChangeOrderSyncRun" ADD CONSTRAINT "PrimeChangeOrderSyncRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
