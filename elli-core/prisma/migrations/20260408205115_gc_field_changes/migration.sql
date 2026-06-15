/*
  Warnings:

  - The values [PROSPECTING,BLACKLISTED] on the enum `GCStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `GCType` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "GCStatus_new" AS ENUM ('ACTIVE', 'INACTIVE');
ALTER TABLE "public"."GeneralContractor" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "GeneralContractor" ALTER COLUMN "status" TYPE "GCStatus_new" USING ("status"::text::"GCStatus_new");
ALTER TYPE "GCStatus" RENAME TO "GCStatus_old";
ALTER TYPE "GCStatus_new" RENAME TO "GCStatus";
DROP TYPE "public"."GCStatus_old";
ALTER TABLE "GeneralContractor" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- DropForeignKey
ALTER TABLE "GeneralContractor" DROP CONSTRAINT "GeneralContractor_gcTypeId_fkey";

-- AlterTable
ALTER TABLE "GeneralContractor" ADD COLUMN     "fax" TEXT;

-- DropTable
DROP TABLE "GCType";

-- CreateTable
CREATE TABLE "VendorDocument" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "expiresOn" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GCDocument" (
    "id" TEXT NOT NULL,
    "gcId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "expiresOn" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GCDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VendorDocument_fileId_idx" ON "VendorDocument"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorDocument_vendorId_fileId_key" ON "VendorDocument"("vendorId", "fileId");

-- CreateIndex
CREATE INDEX "GCDocument_fileId_idx" ON "GCDocument"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "GCDocument_gcId_fileId_key" ON "GCDocument"("gcId", "fileId");

-- AddForeignKey
ALTER TABLE "VendorDocument" ADD CONSTRAINT "VendorDocument_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDocument" ADD CONSTRAINT "VendorDocument_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneralContractor" ADD CONSTRAINT "GeneralContractor_gcTypeId_fkey" FOREIGN KEY ("gcTypeId") REFERENCES "Lookup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GCDocument" ADD CONSTRAINT "GCDocument_gcId_fkey" FOREIGN KEY ("gcId") REFERENCES "GeneralContractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GCDocument" ADD CONSTRAINT "GCDocument_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
