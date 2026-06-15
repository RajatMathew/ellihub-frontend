/*
  Warnings:

  - You are about to drop the column `qty` on the `SubCOLineItem` table. All the data in the column will be lost.
  - Added the required column `quantity` to the `SubCOLineItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SubCOLineItem" DROP COLUMN "qty",
ADD COLUMN     "quantity" DOUBLE PRECISION NOT NULL;
