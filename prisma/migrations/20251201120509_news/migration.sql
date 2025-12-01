-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "project";

-- CreateEnum
CREATE TYPE "directory"."ClientType" AS ENUM ('GENERAL_CONTRACTOR', 'VENDOR');

-- CreateEnum
CREATE TYPE "directory"."Status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "directory"."AddressType" AS ENUM ('BILLING', 'OFFICE', 'SITE', 'OTHER');

-- CreateTable
CREATE TABLE "directory"."Client" (
    "id" TEXT NOT NULL,
    "clientType" "directory"."ClientType" NOT NULL,
    "companyName" TEXT NOT NULL,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "status" "directory"."Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "directory"."Address" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "directory"."AddressType" NOT NULL,
    "street1" TEXT NOT NULL,
    "street2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "directory"."Contact" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "title" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "directory"."GeneralContractor" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "licenseState" TEXT,
    "prequalified" BOOLEAN NOT NULL DEFAULT false,
    "bondingCapacity" DECIMAL(65,30),

    CONSTRAINT "GeneralContractor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "directory"."Vendor" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceCategory" TEXT,
    "serviceDescription" TEXT,
    "w9OnFile" BOOLEAN NOT NULL DEFAULT false,

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
    "clientId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeneralContractor_clientId_key" ON "directory"."GeneralContractor"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_clientId_key" ON "directory"."Vendor"("clientId");

-- AddForeignKey
ALTER TABLE "directory"."Address" ADD CONSTRAINT "Address_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "directory"."Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."Contact" ADD CONSTRAINT "Contact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "directory"."Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."GeneralContractor" ADD CONSTRAINT "GeneralContractor_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "directory"."Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."Vendor" ADD CONSTRAINT "Vendor_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "directory"."Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."Service" ADD CONSTRAINT "Service_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "directory"."Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory"."Note" ADD CONSTRAINT "Note_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "directory"."Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project"."Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "directory"."Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
