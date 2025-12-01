/*
  Warnings:

  - You are about to drop the column `clientId` on the `GeneralContractor` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `serviceCategory` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `serviceDescription` on the `Vendor` table. All the data in the column will be lost.
  - You are about to drop the column `w9OnFile` on the `Vendor` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[generalContractorId]` on the table `Client` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[vendorId]` on the table `Client` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[primaryContactId]` on the table `GeneralContractor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[addressId]` on the table `GeneralContractor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[billingAddressId]` on the table `GeneralContractor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[shippingAddressId]` on the table `GeneralContractor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[primaryContactId]` on the table `Vendor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[generalAddressId]` on the table `Vendor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[billingAddressId]` on the table `Vendor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[shippingAddressId]` on the table `Vendor` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `companyName` to the `Vendor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `taxId` to the `Vendor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vendorType` to the `Vendor` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "directory"."VendorType" AS ENUM ('SUBCONTRACTOR', 'MATERIAL_SUPPLIER', 'CONSULTANT', 'CARRIER');

-- CreateEnum
CREATE TYPE "directory"."VendorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLACKLISTED');

-- CreateEnum
CREATE TYPE "directory"."ComplianceStatus" AS ENUM ('COMPLIANT', 'NON_COMPLIANT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "project"."ManagerType" AS ENUM ('PROJECT_MANAGER', 'SITE_MANAGER', 'CONSTRUCTION_MANAGER', 'SAFETY_MANAGER', 'OTHER');

-- CreateEnum
CREATE TYPE "project"."TaskType" AS ENUM ('DESIGN', 'PLANNING', 'EXECUTION', 'REVIEW', 'OTHER');

-- CreateEnum
CREATE TYPE "project"."TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "directory"."ClientType" ADD VALUE 'COMMON';

-- DropForeignKey
ALTER TABLE "directory"."Contact" DROP CONSTRAINT "Contact_clientId_fkey";

-- DropForeignKey
ALTER TABLE "directory"."GeneralContractor" DROP CONSTRAINT "GeneralContractor_clientId_fkey";

-- DropForeignKey
ALTER TABLE "directory"."Vendor" DROP CONSTRAINT "Vendor_clientId_fkey";

-- DropIndex
DROP INDEX "directory"."GeneralContractor_clientId_key";

-- DropIndex
DROP INDEX "directory"."Vendor_clientId_key";

-- AlterTable
ALTER TABLE "directory"."Address" ADD COLUMN     "generalContractorId" TEXT,
ADD COLUMN     "vendorId" TEXT;

-- AlterTable
ALTER TABLE "directory"."Client" ADD COLUMN     "generalContractorId" TEXT,
ADD COLUMN     "vendorId" TEXT;

-- AlterTable
ALTER TABLE "directory"."Contact" ADD COLUMN     "vendorId" TEXT,
ALTER COLUMN "clientId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "directory"."GeneralContractor" DROP COLUMN "clientId",
ADD COLUMN     "addressId" TEXT,
ADD COLUMN     "billingAddressId" TEXT,
ADD COLUMN     "primaryContactId" TEXT,
ADD COLUMN     "shippingAddressId" TEXT;

-- AlterTable
ALTER TABLE "directory"."Vendor" DROP COLUMN "clientId",
DROP COLUMN "serviceCategory",
DROP COLUMN "serviceDescription",
DROP COLUMN "w9OnFile",
ADD COLUMN     "billingAddressId" TEXT,
ADD COLUMN     "companyName" TEXT NOT NULL,
ADD COLUMN     "complianceStatus" "directory"."ComplianceStatus" NOT NULL DEFAULT 'COMPLIANT',
ADD COLUMN     "defaultPaymentTerms" TEXT,
ADD COLUMN     "defaultRetainagePercent" DECIMAL(65,30),
ADD COLUMN     "generalAddressId" TEXT,
ADD COLUMN     "insuranceGlExpiry" TIMESTAMP(3),
ADD COLUMN     "insuranceUmbrellaExpiry" TIMESTAMP(3),
ADD COLUMN     "insuranceWcExpiry" TIMESTAMP(3),
ADD COLUMN     "primaryContactId" TEXT,
ADD COLUMN     "shippingAddressId" TEXT,
ADD COLUMN     "status" "directory"."VendorStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "taxId" TEXT NOT NULL,
ADD COLUMN     "vendorType" "directory"."VendorType" NOT NULL;

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
CREATE TABLE "directory"."_VendorAddresses" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_VendorAddresses_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "directory"."_AddressToGeneralContractor" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AddressToGeneralContractor_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_VendorAddresses_B_index" ON "directory"."_VendorAddresses"("B");

-- CreateIndex
CREATE INDEX "_AddressToGeneralContractor_B_index" ON "directory"."_AddressToGeneralContractor"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Client_generalContractorId_key" ON "directory"."Client"("generalContractorId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_vendorId_key" ON "directory"."Client"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "GeneralContractor_primaryContactId_key" ON "directory"."GeneralContractor"("primaryContactId");

-- CreateIndex
CREATE UNIQUE INDEX "GeneralContractor_addressId_key" ON "directory"."GeneralContractor"("addressId");

-- CreateIndex
CREATE UNIQUE INDEX "GeneralContractor_billingAddressId_key" ON "directory"."GeneralContractor"("billingAddressId");

-- CreateIndex
CREATE UNIQUE INDEX "GeneralContractor_shippingAddressId_key" ON "directory"."GeneralContractor"("shippingAddressId");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_primaryContactId_key" ON "directory"."Vendor"("primaryContactId");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_generalAddressId_key" ON "directory"."Vendor"("generalAddressId");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_billingAddressId_key" ON "directory"."Vendor"("billingAddressId");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_shippingAddressId_key" ON "directory"."Vendor"("shippingAddressId");

-- AddForeignKey
ALTER TABLE "directory"."Client" ADD CONSTRAINT "Client_generalContractorId_fkey" FOREIGN KEY ("generalContractorId") REFERENCES "directory"."GeneralContractor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."Client" ADD CONSTRAINT "Client_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "directory"."Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."Contact" ADD CONSTRAINT "Contact_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "directory"."Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."Contact" ADD CONSTRAINT "Contact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "directory"."Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."GeneralContractor" ADD CONSTRAINT "GeneralContractor_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "directory"."Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."GeneralContractor" ADD CONSTRAINT "GeneralContractor_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "directory"."Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."GeneralContractor" ADD CONSTRAINT "GeneralContractor_billingAddressId_fkey" FOREIGN KEY ("billingAddressId") REFERENCES "directory"."Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."GeneralContractor" ADD CONSTRAINT "GeneralContractor_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "directory"."Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."Vendor" ADD CONSTRAINT "Vendor_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "directory"."Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."Vendor" ADD CONSTRAINT "Vendor_generalAddressId_fkey" FOREIGN KEY ("generalAddressId") REFERENCES "directory"."Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."Vendor" ADD CONSTRAINT "Vendor_billingAddressId_fkey" FOREIGN KEY ("billingAddressId") REFERENCES "directory"."Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."Vendor" ADD CONSTRAINT "Vendor_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "directory"."Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "directory"."_AddressToGeneralContractor" ADD CONSTRAINT "_AddressToGeneralContractor_A_fkey" FOREIGN KEY ("A") REFERENCES "directory"."Address"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."_AddressToGeneralContractor" ADD CONSTRAINT "_AddressToGeneralContractor_B_fkey" FOREIGN KEY ("B") REFERENCES "directory"."GeneralContractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
