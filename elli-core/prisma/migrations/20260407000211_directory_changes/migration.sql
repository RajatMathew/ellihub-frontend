-- CreateEnum
CREATE TYPE "PaymentTerms" AS ENUM ('NET_15', 'NET_30', 'NET_45', 'NET_60', 'NET_90', 'DUE_ON_RECEIPT');

-- CreateEnum
CREATE TYPE "VendorType" AS ENUM ('MATERIAL', 'FABRICATION', 'INSTALLATION');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLACKLISTED', 'PROSPECT');

-- CreateEnum
CREATE TYPE "GCStatus" AS ENUM ('ACTIVE', 'PROSPECTING', 'INACTIVE', 'BLACKLISTED');

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "VendorType" NOT NULL,
    "categoryTags" TEXT[],
    "taxId" TEXT,
    "status" "VendorStatus" NOT NULL,
    "address" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "paymentTerms" "PaymentTerms" NOT NULL DEFAULT 'NET_30',
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "GeneralContractor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gcTypeId" TEXT NOT NULL,
    "status" "GCStatus" NOT NULL DEFAULT 'ACTIVE',
    "address" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "paymentTerms" "PaymentTerms" NOT NULL DEFAULT 'NET_30',
    "retainagePercent" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneralContractor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "professionalRoleId" TEXT,
    "email" JSONB,
    "phoneNumber" JSONB,
    "tags" TEXT[],
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

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
CREATE INDEX "Vendor_name_idx" ON "Vendor"("name");

-- CreateIndex
CREATE INDEX "Vendor_status_idx" ON "Vendor"("status");

-- CreateIndex
CREATE INDEX "Vendor_type_idx" ON "Vendor"("type");

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

-- CreateIndex
CREATE INDEX "Contact_fullName_idx" ON "Contact"("fullName");

-- CreateIndex
CREATE INDEX "Contact_deletedAt_idx" ON "Contact"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContactVendor_contactId_vendorId_key" ON "ContactVendor"("contactId", "vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactGC_contactId_generalContractorId_key" ON "ContactGC"("contactId", "generalContractorId");

-- AddForeignKey
ALTER TABLE "GeneralContractor" ADD CONSTRAINT "GeneralContractor_gcTypeId_fkey" FOREIGN KEY ("gcTypeId") REFERENCES "GCType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_professionalRoleId_fkey" FOREIGN KEY ("professionalRoleId") REFERENCES "Lookup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactVendor" ADD CONSTRAINT "ContactVendor_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactVendor" ADD CONSTRAINT "ContactVendor_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactGC" ADD CONSTRAINT "ContactGC_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactGC" ADD CONSTRAINT "ContactGC_generalContractorId_fkey" FOREIGN KEY ("generalContractorId") REFERENCES "GeneralContractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
