-- DropForeignKey
ALTER TABLE "ContactEntityLink" DROP CONSTRAINT "ContactEntityLink_contactId_fkey";

-- DropForeignKey
ALTER TABLE "ContactEntityLink" DROP CONSTRAINT "ContactEntityLink_entityTypeId_fkey";

-- DropTable
DROP TABLE "ContactEntityLink";

-- DropTable
DROP TABLE "ContactEntityType";

-- CreateTable
CREATE TABLE "ContactVendor" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactVendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactGC" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "generalContractorId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactGC_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContactVendor_contactId_vendorId_key" ON "ContactVendor"("contactId", "vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactGC_contactId_generalContractorId_key" ON "ContactGC"("contactId", "generalContractorId");

-- AddForeignKey
ALTER TABLE "ContactVendor" ADD CONSTRAINT "ContactVendor_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactVendor" ADD CONSTRAINT "ContactVendor_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactGC" ADD CONSTRAINT "ContactGC_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactGC" ADD CONSTRAINT "ContactGC_generalContractorId_fkey" FOREIGN KEY ("generalContractorId") REFERENCES "GeneralContractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
