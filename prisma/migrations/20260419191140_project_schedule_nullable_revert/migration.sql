/*
  Warnings:

  - Made the column `description` on table `ProjectSchedule` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ProjectSchedule" DROP CONSTRAINT "ProjectSchedule_fileId_fkey";

-- AlterTable
ALTER TABLE "ProjectSchedule" ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "fileId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ProjectSchedule" ADD CONSTRAINT "ProjectSchedule_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
