-- CreateTable
CREATE TABLE "PlannedPOPayment" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "isReady" BOOLEAN NOT NULL DEFAULT false,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannedPOPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlannedPOPayment_purchaseOrderId_idx" ON "PlannedPOPayment"("purchaseOrderId");

-- AddForeignKey
ALTER TABLE "PlannedPOPayment" ADD CONSTRAINT "PlannedPOPayment_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
