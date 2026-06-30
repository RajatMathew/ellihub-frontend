/*
  Warnings:

  - You are about to drop the column `categoryId` on the `SubCOLineItem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "SubCOLineItem" DROP CONSTRAINT "SubCOLineItem_categoryId_fkey";

-- DropIndex
DROP INDEX "SubCOLineItem_categoryId_idx";

-- AlterTable
ALTER TABLE "SubCOLineItem" DROP COLUMN "categoryId";
