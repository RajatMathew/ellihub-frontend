/*
  Warnings:

  - Made the column `fileId` on table `ProjectSchedule` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ProjectSchedule" DROP CONSTRAINT "ProjectSchedule_fileId_fkey";

-- AlterTable
ALTER TABLE "ProjectSchedule" ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "fileId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "ProjectSchedule" ADD CONSTRAINT "ProjectSchedule_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
