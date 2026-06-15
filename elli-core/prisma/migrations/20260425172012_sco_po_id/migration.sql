/*
  Warnings:

  - Added the required column `purchaseOrderId` to the `SubChangeOrder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SubChangeOrder" ADD COLUMN     "purchaseOrderId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "SubChangeOrder_purchaseOrderId_idx" ON "SubChangeOrder"("purchaseOrderId");

-- AddForeignKey
ALTER TABLE "SubChangeOrder" ADD CONSTRAINT "SubChangeOrder_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
