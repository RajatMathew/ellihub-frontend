/*
  Warnings:

  - You are about to drop the `ContactGC` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ContactVendor` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ContactGC" DROP CONSTRAINT "ContactGC_contactId_fkey";

-- DropForeignKey
ALTER TABLE "ContactGC" DROP CONSTRAINT "ContactGC_generalContractorId_fkey";

-- DropForeignKey
ALTER TABLE "ContactVendor" DROP CONSTRAINT "ContactVendor_contactId_fkey";

-- DropForeignKey
ALTER TABLE "ContactVendor" DROP CONSTRAINT "ContactVendor_vendorId_fkey";

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "generalContractorId" TEXT,
ADD COLUMN     "vendorId" TEXT;

-- DropTable
DROP TABLE "ContactGC";

-- DropTable
DROP TABLE "ContactVendor";

-- CreateIndex
CREATE INDEX "Contact_vendorId_idx" ON "Contact"("vendorId");

-- CreateIndex
CREATE INDEX "Contact_generalContractorId_idx" ON "Contact"("generalContractorId");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_generalContractorId_fkey" FOREIGN KEY ("generalContractorId") REFERENCES "GeneralContractor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddCheck: a contact may be linked to a vendor OR a GC, never both
ALTER TABLE "Contact"
    ADD CONSTRAINT "Contact_vendor_or_gc_exclusive"
    CHECK ("vendorId" IS NULL OR "generalContractorId" IS NULL);
