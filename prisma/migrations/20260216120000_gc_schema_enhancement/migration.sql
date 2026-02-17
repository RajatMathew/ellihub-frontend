-- CreateEnum
CREATE TYPE "PaymentTerms" AS ENUM ('NET_15', 'NET_30', 'NET_45', 'NET_60', 'NET_90', 'DUE_ON_RECEIPT');

-- AlterEnum
BEGIN;
CREATE TYPE "GCStatus_new" AS ENUM ('ACTIVE', 'PROSPECTING', 'INACTIVE', 'BLACKLISTED');
ALTER TABLE "GeneralContractor" ALTER COLUMN "status" TYPE "GCStatus_new" USING ("status"::text::"GCStatus_new");
ALTER TYPE "GCStatus" RENAME TO "GCStatus_old";
ALTER TYPE "GCStatus_new" RENAME TO "GCStatus";
DROP TYPE "public"."GCStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "GeneralContractor" DROP COLUMN "type",
ADD COLUMN     "gcTypeId" TEXT NOT NULL,
ADD COLUMN     "paymentTerms" "PaymentTerms" NOT NULL DEFAULT 'NET_30',
ADD COLUMN     "retainagePercent" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
ADD COLUMN     "website" TEXT,
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- DropEnum
DROP TYPE "GCType";

-- CreateTable
CREATE TABLE "GCType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GCType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GCType_name_key" ON "GCType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GCType_code_key" ON "GCType"("code");

-- CreateIndex
CREATE INDEX "GCType_name_idx" ON "GCType"("name");

-- CreateIndex
CREATE INDEX "GCType_code_idx" ON "GCType"("code");

-- CreateIndex
CREATE INDEX "GeneralContractor_name_idx" ON "GeneralContractor"("name");

-- CreateIndex
CREATE INDEX "GeneralContractor_status_idx" ON "GeneralContractor"("status");

-- CreateIndex
CREATE INDEX "GeneralContractor_gcTypeId_idx" ON "GeneralContractor"("gcTypeId");

-- CreateIndex
CREATE INDEX "GeneralContractor_deletedAt_idx" ON "GeneralContractor"("deletedAt");

-- AddForeignKey
ALTER TABLE "GeneralContractor" ADD CONSTRAINT "GeneralContractor_gcTypeId_fkey" FOREIGN KEY ("gcTypeId") REFERENCES "GCType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
