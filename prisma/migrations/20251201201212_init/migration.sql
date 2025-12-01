-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "directory";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "project";

-- CreateEnum
CREATE TYPE "directory"."AddressType" AS ENUM ('BILLING', 'OFFICE', 'SITE', 'OTHER');

-- CreateEnum
CREATE TYPE "directory"."VendorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLACKLISTED');

-- CreateEnum
CREATE TYPE "directory"."Status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "directory"."ComplianceStatus" AS ENUM ('COMPLIANT', 'NON_COMPLIANT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "project"."ManagerType" AS ENUM ('PROJECT_MANAGER', 'SITE_MANAGER', 'CONSTRUCTION_MANAGER', 'SAFETY_MANAGER', 'OTHER');

-- CreateEnum
CREATE TYPE "project"."TaskType" AS ENUM ('DESIGN', 'PLANNING', 'EXECUTION', 'REVIEW', 'OTHER');

-- CreateEnum
CREATE TYPE "project"."TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "directory"."Address" (
    "id" TEXT NOT NULL,
    "type" "directory"."AddressType" NOT NULL,
    "street1" TEXT NOT NULL,
    "street2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'US/Eastern',
    "vendorId" TEXT,
    "contractorId" TEXT,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "directory"."Contact" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "title" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "vendorId" TEXT,
    "contractorId" TEXT,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "directory"."Contractor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "licenseState" TEXT,
    "prequalified" BOOLEAN NOT NULL DEFAULT false,
    "bondingCapacity" DECIMAL(65,30),
    "status" "directory"."Status" NOT NULL DEFAULT 'ACTIVE',
    "primaryContactId" TEXT,
    "billingAddressId" TEXT,
    "primaryAddressId" TEXT,
    "shippingAddressId" TEXT,

    CONSTRAINT "Contractor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "directory"."VendorType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "VendorType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "directory"."Vendor" (
    "id" TEXT NOT NULL,
    "vendorTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "status" "directory"."VendorStatus" NOT NULL DEFAULT 'ACTIVE',
    "defaultPaymentTerms" TEXT,
    "defaultRetainagePercent" DECIMAL(65,30),
    "insuranceGlExpiry" TIMESTAMP(3),
    "insuranceWcExpiry" TIMESTAMP(3),
    "insuranceUmbrellaExpiry" TIMESTAMP(3),
    "complianceStatus" "directory"."ComplianceStatus" NOT NULL DEFAULT 'COMPLIANT',
    "primaryContactId" TEXT,
    "billingAddressId" TEXT,
    "primaryAddressId" TEXT,
    "shippingAddressId" TEXT,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "directory"."Service" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "directory"."Note" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vendorId" TEXT,
    "contractorId" TEXT,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project"."Project" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "contractorId" TEXT,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project"."RFQDocument" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RFQDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project"."ProjectManager" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "project"."ManagerType" NOT NULL DEFAULT 'PROJECT_MANAGER',

    CONSTRAINT "ProjectManager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project"."Task" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "project"."TaskStatus" NOT NULL DEFAULT 'PENDING',
    "assignedTo" TEXT,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "directory"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "directory"."_VendorAddresses" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_VendorAddresses_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "directory"."_ContractorAddresses" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ContractorAddresses_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contractor_primaryContactId_key" ON "directory"."Contractor"("primaryContactId");

-- CreateIndex
CREATE UNIQUE INDEX "Contractor_billingAddressId_key" ON "directory"."Contractor"("billingAddressId");

-- CreateIndex
CREATE UNIQUE INDEX "Contractor_primaryAddressId_key" ON "directory"."Contractor"("primaryAddressId");

-- CreateIndex
CREATE UNIQUE INDEX "Contractor_shippingAddressId_key" ON "directory"."Contractor"("shippingAddressId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorType_name_key" ON "directory"."VendorType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_primaryContactId_key" ON "directory"."Vendor"("primaryContactId");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_billingAddressId_key" ON "directory"."Vendor"("billingAddressId");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_primaryAddressId_key" ON "directory"."Vendor"("primaryAddressId");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_shippingAddressId_key" ON "directory"."Vendor"("shippingAddressId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "directory"."User"("email");

-- CreateIndex
CREATE INDEX "_VendorAddresses_B_index" ON "directory"."_VendorAddresses"("B");

-- CreateIndex
CREATE INDEX "_ContractorAddresses_B_index" ON "directory"."_ContractorAddresses"("B");

-- AddForeignKey
ALTER TABLE "directory"."Contact" ADD CONSTRAINT "Contact_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "directory"."Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."Contact" ADD CONSTRAINT "Contact_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "directory"."Contractor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."Contractor" ADD CONSTRAINT "Contractor_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "directory"."Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."Contractor" ADD CONSTRAINT "Contractor_billingAddressId_fkey" FOREIGN KEY ("billingAddressId") REFERENCES "directory"."Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."Contractor" ADD CONSTRAINT "Contractor_primaryAddressId_fkey" FOREIGN KEY ("primaryAddressId") REFERENCES "directory"."Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."Contractor" ADD CONSTRAINT "Contractor_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "directory"."Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."Vendor" ADD CONSTRAINT "Vendor_vendorTypeId_fkey" FOREIGN KEY ("vendorTypeId") REFERENCES "directory"."VendorType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."Vendor" ADD CONSTRAINT "Vendor_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "directory"."Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."Vendor" ADD CONSTRAINT "Vendor_billingAddressId_fkey" FOREIGN KEY ("billingAddressId") REFERENCES "directory"."Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."Vendor" ADD CONSTRAINT "Vendor_primaryAddressId_fkey" FOREIGN KEY ("primaryAddressId") REFERENCES "directory"."Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."Vendor" ADD CONSTRAINT "Vendor_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "directory"."Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."Service" ADD CONSTRAINT "Service_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "directory"."Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."Note" ADD CONSTRAINT "Note_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "directory"."Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."Note" ADD CONSTRAINT "Note_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "directory"."Contractor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project"."Project" ADD CONSTRAINT "Project_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "directory"."Contractor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project"."RFQDocument" ADD CONSTRAINT "RFQDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"."Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project"."ProjectManager" ADD CONSTRAINT "ProjectManager_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"."Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project"."ProjectManager" ADD CONSTRAINT "ProjectManager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "directory"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project"."Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"."Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."_VendorAddresses" ADD CONSTRAINT "_VendorAddresses_A_fkey" FOREIGN KEY ("A") REFERENCES "directory"."Address"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."_VendorAddresses" ADD CONSTRAINT "_VendorAddresses_B_fkey" FOREIGN KEY ("B") REFERENCES "directory"."Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."_ContractorAddresses" ADD CONSTRAINT "_ContractorAddresses_A_fkey" FOREIGN KEY ("A") REFERENCES "directory"."Address"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."_ContractorAddresses" ADD CONSTRAINT "_ContractorAddresses_B_fkey" FOREIGN KEY ("B") REFERENCES "directory"."Contractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
