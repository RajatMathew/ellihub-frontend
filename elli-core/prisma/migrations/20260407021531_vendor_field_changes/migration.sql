/*
  Warnings:

  - You are about to drop the column `typeid` on the `Vendor` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Vendor" DROP CONSTRAINT "Vendor_typeid_fkey";

-- AlterTable
ALTER TABLE "Vendor" DROP COLUMN "typeid",
ADD COLUMN     "typeId" TEXT;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "Lookup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
