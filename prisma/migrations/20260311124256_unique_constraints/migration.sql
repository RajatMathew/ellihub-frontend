/*
  Warnings:

  - You are about to drop the column `totalContractValue` on the `PrimeContract` table. All the data in the column will be lost.
  - You are about to drop the `POPayment` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[email]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[invoiceDocumentId]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[documentId]` on the table `InvoiceAttachment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[documentId]` on the table `PCOAttachment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[documentId]` on the table `POAttachment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[executedContractDocId]` on the table `PrimeContract` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[documentId]` on the table `PrimeContractAttachment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[fileId]` on the table `ProjectScheduleEntry` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[documentId]` on the table `QuoteAttachment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[documentId]` on the table `RFQAttachment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[documentId]` on the table `SCOAttachment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_invoiceDocumentId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_purchaseOrderId_fkey";

-- DropForeignKey
ALTER TABLE "POPayment" DROP CONSTRAINT "POPayment_purchaseOrderId_fkey";

-- DropForeignKey
ALTER TABLE "PrimeChangeOrder" DROP CONSTRAINT "PrimeChangeOrder_createdBy_fkey";

-- DropIndex
DROP INDEX "Employee_name_key";

-- DropIndex
DROP INDEX "Employee_phoneNumber_key";

-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "purchaseOrderId" DROP NOT NULL,
ALTER COLUMN "invoiceDocumentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PrimeContract" DROP COLUMN "totalContractValue";

-- DropTable
DROP TABLE "POPayment";

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceDocumentId_key" ON "Invoice"("invoiceDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceAttachment_documentId_key" ON "InvoiceAttachment"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "PCOAttachment_documentId_key" ON "PCOAttachment"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "POAttachment_documentId_key" ON "POAttachment"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "PrimeContract_executedContractDocId_key" ON "PrimeContract"("executedContractDocId");

-- CreateIndex
CREATE UNIQUE INDEX "PrimeContractAttachment_documentId_key" ON "PrimeContractAttachment"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectScheduleEntry_fileId_key" ON "ProjectScheduleEntry"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteAttachment_documentId_key" ON "QuoteAttachment"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "RFQAttachment_documentId_key" ON "RFQAttachment"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "SCOAttachment_documentId_key" ON "SCOAttachment"("documentId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_invoiceDocumentId_fkey" FOREIGN KEY ("invoiceDocumentId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
