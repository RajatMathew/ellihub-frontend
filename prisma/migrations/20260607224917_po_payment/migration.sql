-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "fullyPaid" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PoPayment" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "qbVendorId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "txnDate" DATE NOT NULL,
    "transactionId" TEXT,
    "transactionUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PoPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PoPayment_purchaseOrderId_idx" ON "PoPayment"("purchaseOrderId");

-- AddForeignKey
ALTER TABLE "PoPayment" ADD CONSTRAINT "PoPayment_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
