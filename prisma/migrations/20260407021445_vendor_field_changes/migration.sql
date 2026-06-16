/*
  Warnings:

  - The values [BLACKLISTED,PROSPECT] on the enum `VendorStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `type` on the `Vendor` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "VendorStatus_new" AS ENUM ('ACTIVE', 'INACTIVE');
ALTER TABLE "Vendor" ALTER COLUMN "status" TYPE "VendorStatus_new" USING ("status"::text::"VendorStatus_new");
ALTER TYPE "VendorStatus" RENAME TO "VendorStatus_old";
ALTER TYPE "VendorStatus_new" RENAME TO "VendorStatus";
DROP TYPE "public"."VendorStatus_old";
COMMIT;

-- DropIndex
DROP INDEX "Vendor_type_idx";

-- AlterTable
ALTER TABLE "Vendor" DROP COLUMN "type",
ADD COLUMN     "fax" TEXT,
ADD COLUMN     "typeid" TEXT;

-- DropEnum
DROP TYPE "VendorType";

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_typeid_fkey" FOREIGN KEY ("typeid") REFERENCES "Lookup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
