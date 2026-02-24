/*
  Warnings:

  - You are about to drop the column `budgetPercentage` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `contractValue` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `stage` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the `PrimePayments` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[primeCoid,sequenceNumber]` on the table `PrimeCOLineItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[pcoNumber]` on the table `PrimeChangeOrder` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[jobNumber]` on the table `Project` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `qty` to the `PrimeCOLineItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sequenceNumber` to the `PrimeCOLineItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit` to the `PrimeCOLineItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitPrice` to the `PrimeCOLineItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdBy` to the `PrimeChangeOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pcoNumber` to the `PrimeChangeOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stageId` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `statusId` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ChangeOrderStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED', 'VOID');

-- CreateEnum
CREATE TYPE "ChangeOrderPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- DropForeignKey
ALTER TABLE "PrimePayments" DROP CONSTRAINT "PrimePayments_projectId_fkey";

-- DropIndex
DROP INDEX "PrimeChangeOrder_projectId_key";

-- DropIndex
DROP INDEX "ProjectScheduleEntry_projectId_key";

-- AlterTable
ALTER TABLE "PrimeCOLineItem" ADD COLUMN     "qty" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "sequenceNumber" INTEGER NOT NULL,
ADD COLUMN     "unit" TEXT NOT NULL,
ADD COLUMN     "unitPrice" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "costCodeId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PrimeChangeOrder" ADD COLUMN     "changeTypeId" TEXT,
ADD COLUMN     "contactId" TEXT,
ADD COLUMN     "costCodeId" TEXT,
ADD COLUMN     "createdBy" TEXT NOT NULL,
ADD COLUMN     "estimatedCost" DOUBLE PRECISION,
ADD COLUMN     "estimatedMargin" DOUBLE PRECISION,
ADD COLUMN     "estimatedMarginPercent" DOUBLE PRECISION,
ADD COLUMN     "impactsSchedule" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "markupAmount" DOUBLE PRECISION,
ADD COLUMN     "pcoNumber" TEXT NOT NULL,
ADD COLUMN     "priority" "ChangeOrderPriority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "requestedBy" TEXT,
ADD COLUMN     "revisionNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "scheduleImpactDays" INTEGER,
ADD COLUMN     "status" "ChangeOrderStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "supersededBy" TEXT;

-- AlterTable
ALTER TABLE "PrimeContract" ADD COLUMN     "actualCompletionDate" TIMESTAMP(3),
ADD COLUMN     "actualStartDate" TIMESTAMP(3),
ADD COLUMN     "contractType" TEXT,
ADD COLUMN     "estimatedCompletionDate" TIMESTAMP(3),
ADD COLUMN     "estimatedStartDate" TIMESTAMP(3),
ADD COLUMN     "executedContractDocId" TEXT,
ADD COLUMN     "paymentTerms" "PaymentTerms",
ADD COLUMN     "retainagePercent" DECIMAL(5,2),
ADD COLUMN     "targetBudgetPercent" DECIMAL(5,2),
ADD COLUMN     "totalContractValue" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "budgetPercentage",
DROP COLUMN "contractValue",
DROP COLUMN "endDate",
DROP COLUMN "stage",
DROP COLUMN "startDate",
ADD COLUMN     "city" TEXT,
ADD COLUMN     "contractNumber" TEXT,
ADD COLUMN     "effectiveEndDate" TIMESTAMP(3),
ADD COLUMN     "effectiveStartDate" TIMESTAMP(3),
ADD COLUMN     "jobNumber" TEXT,
ADD COLUMN     "stageId" TEXT NOT NULL,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "statusId" TEXT NOT NULL,
ADD COLUMN     "streetAddress" TEXT,
ADD COLUMN     "zipCode" TEXT;

-- AlterTable
ALTER TABLE "ProjectScheduleEntry" ADD COLUMN     "adjustedFinishDate" TIMESTAMP(3),
ADD COLUMN     "adjustedStartDate" TIMESTAMP(3),
ADD COLUMN     "changeOrderId" TEXT,
ADD COLUMN     "fileId" TEXT,
ADD COLUMN     "notes" TEXT;

-- DropTable
DROP TABLE "PrimePayments";

-- DropEnum
DROP TYPE "ProjectStage";

-- CreateTable
CREATE TABLE "ProjectStage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PCOChangeType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PCOChangeType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PCOStatusHistory" (
    "id" TEXT NOT NULL,
    "pcoId" TEXT NOT NULL,
    "fromStatus" "ChangeOrderStatus",
    "toStatus" "ChangeOrderStatus" NOT NULL,
    "changedBy" TEXT NOT NULL,
    "onBehalfOf" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PCOStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PCOAttachment" (
    "id" TEXT NOT NULL,
    "pcoId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PCOAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectStage_name_key" ON "ProjectStage"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectStage_code_key" ON "ProjectStage"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectStatus_name_key" ON "ProjectStatus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectStatus_order_key" ON "ProjectStatus"("order");

-- CreateIndex
CREATE UNIQUE INDEX "PCOChangeType_name_key" ON "PCOChangeType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PCOChangeType_code_key" ON "PCOChangeType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PCOChangeType_order_key" ON "PCOChangeType"("order");

-- CreateIndex
CREATE INDEX "PCOStatusHistory_pcoId_idx" ON "PCOStatusHistory"("pcoId");

-- CreateIndex
CREATE INDEX "PCOAttachment_pcoId_idx" ON "PCOAttachment"("pcoId");

-- CreateIndex
CREATE INDEX "PrimeCOLineItem_primeCoid_idx" ON "PrimeCOLineItem"("primeCoid");

-- CreateIndex
CREATE UNIQUE INDEX "PrimeCOLineItem_primeCoid_sequenceNumber_key" ON "PrimeCOLineItem"("primeCoid", "sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PrimeChangeOrder_pcoNumber_key" ON "PrimeChangeOrder"("pcoNumber");

-- CreateIndex
CREATE INDEX "PrimeChangeOrder_projectId_status_date_idx" ON "PrimeChangeOrder"("projectId", "status", "date");

-- CreateIndex
CREATE INDEX "PrimeChangeOrder_pcoNumber_idx" ON "PrimeChangeOrder"("pcoNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Project_jobNumber_key" ON "Project"("jobNumber");

-- CreateIndex
CREATE INDEX "Project_stageId_idx" ON "Project"("stageId");

-- CreateIndex
CREATE INDEX "Project_statusId_idx" ON "Project"("statusId");

-- CreateIndex
CREATE INDEX "Project_division_idx" ON "Project"("division");

-- CreateIndex
CREATE INDEX "Project_gcId_idx" ON "Project"("gcId");

-- CreateIndex
CREATE INDEX "Project_leadPMId_idx" ON "Project"("leadPMId");

-- CreateIndex
CREATE INDEX "Project_effectiveStartDate_idx" ON "Project"("effectiveStartDate");

-- CreateIndex
CREATE INDEX "Project_effectiveEndDate_idx" ON "Project"("effectiveEndDate");

-- CreateIndex
CREATE INDEX "ProjectScheduleEntry_projectId_idx" ON "ProjectScheduleEntry"("projectId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "ProjectStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ProjectStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrimeContract" ADD CONSTRAINT "PrimeContract_executedContractDocId_fkey" FOREIGN KEY ("executedContractDocId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectScheduleEntry" ADD CONSTRAINT "ProjectScheduleEntry_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectScheduleEntry" ADD CONSTRAINT "ProjectScheduleEntry_changeOrderId_fkey" FOREIGN KEY ("changeOrderId") REFERENCES "PrimeChangeOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrimeChangeOrder" ADD CONSTRAINT "PrimeChangeOrder_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrimeChangeOrder" ADD CONSTRAINT "PrimeChangeOrder_changeTypeId_fkey" FOREIGN KEY ("changeTypeId") REFERENCES "PCOChangeType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrimeChangeOrder" ADD CONSTRAINT "PrimeChangeOrder_costCodeId_fkey" FOREIGN KEY ("costCodeId") REFERENCES "CostCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrimeChangeOrder" ADD CONSTRAINT "PrimeChangeOrder_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrimeChangeOrder" ADD CONSTRAINT "PrimeChangeOrder_supersededBy_fkey" FOREIGN KEY ("supersededBy") REFERENCES "PrimeChangeOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PCOStatusHistory" ADD CONSTRAINT "PCOStatusHistory_pcoId_fkey" FOREIGN KEY ("pcoId") REFERENCES "PrimeChangeOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PCOAttachment" ADD CONSTRAINT "PCOAttachment_pcoId_fkey" FOREIGN KEY ("pcoId") REFERENCES "PrimeChangeOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PCOAttachment" ADD CONSTRAINT "PCOAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
