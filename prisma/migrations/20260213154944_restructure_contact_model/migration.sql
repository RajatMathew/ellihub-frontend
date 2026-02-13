/*
  Warnings:

  - You are about to drop the column `generalContractorId` on the `Contact` table. All the data in the column will be lost.
  - You are about to drop the column `jobTitle` on the `Contact` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Contact` table. All the data in the column will be lost.
  - You are about to drop the column `vendorId` on the `Contact` table. All the data in the column will be lost.
  - Added the required column `fullName` to the `Contact` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Contact" DROP CONSTRAINT "Contact_generalContractorId_fkey";

-- DropForeignKey
ALTER TABLE "Contact" DROP CONSTRAINT "Contact_vendorId_fkey";

-- AlterTable
ALTER TABLE "Contact" DROP COLUMN "generalContractorId",
DROP COLUMN "jobTitle",
DROP COLUMN "name",
DROP COLUMN "vendorId",
ADD COLUMN     "fullName" TEXT NOT NULL,
ADD COLUMN     "professionalRoleId" TEXT;

-- CreateTable
CREATE TABLE "ProfessionalRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactEntityType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactEntityType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactEntityLink" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "entityTypeId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactEntityLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalRole_name_key" ON "ProfessionalRole"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ContactEntityType_name_key" ON "ContactEntityType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ContactEntityLink_contactId_entityTypeId_entityId_key" ON "ContactEntityLink"("contactId", "entityTypeId", "entityId");

-- CreateIndex
CREATE INDEX "Contact_fullName_idx" ON "Contact"("fullName");

-- CreateIndex
CREATE INDEX "Contact_deletedAt_idx" ON "Contact"("deletedAt");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_professionalRoleId_fkey" FOREIGN KEY ("professionalRoleId") REFERENCES "ProfessionalRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactEntityLink" ADD CONSTRAINT "ContactEntityLink_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactEntityLink" ADD CONSTRAINT "ContactEntityLink_entityTypeId_fkey" FOREIGN KEY ("entityTypeId") REFERENCES "ContactEntityType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
