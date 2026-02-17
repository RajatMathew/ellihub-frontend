/*
  Warnings:

  - Added the required column `budgetPercentage` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `division` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stage` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ProjectStage" AS ENUM ('INSTALLATION', 'FABRICATION', 'SUBMITALLS', 'BUYOUT', 'CLOSEOUT', 'PUNCHLIST');

-- CreateEnum
CREATE TYPE "ProjectDivision" AS ENUM ('SCA', 'DDC', 'CIVIL', 'INSTITUTIONAL');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "budgetPercentage" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "division" "ProjectDivision" NOT NULL,
ADD COLUMN     "stage" "ProjectStage" NOT NULL;
