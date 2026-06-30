/*
  Warnings:

  - You are about to drop the column `effectiveEndDate` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `effectiveStartDate` on the `Project` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Project" DROP COLUMN "effectiveEndDate",
DROP COLUMN "effectiveStartDate",
ADD COLUMN     "estimatedEndDate" TIMESTAMP(3),
ADD COLUMN     "estimatedStartDate" TIMESTAMP(3);
