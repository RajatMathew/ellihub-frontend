/*
  Warnings:

  - Added the required column `contractValue` to the `PrimeContract` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PrimeContract" ADD COLUMN     "contractValue" DECIMAL(65,30) NOT NULL;
