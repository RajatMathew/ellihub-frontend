/*
  Warnings:

  - Made the column `transactionId` on table `PoPayment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `transactionUrl` on table `PoPayment` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "PoPayment" ALTER COLUMN "transactionId" SET NOT NULL,
ALTER COLUMN "transactionUrl" SET NOT NULL;
