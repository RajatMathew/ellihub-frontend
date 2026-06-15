/*
  Warnings:

  - A unique constraint covering the columns `[purchaseOrderId,month,year]` on the table `PlannedPOPayment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "PlannedPOPayment_purchaseOrderId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "PlannedPOPayment_purchaseOrderId_month_year_key" ON "PlannedPOPayment"("purchaseOrderId", "month", "year");
