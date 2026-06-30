-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('DRAFT', 'ISSUED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SCOStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED', 'VOID');

-- AlterTable
ALTER TABLE "activityLog" ADD COLUMN     "affectedEntityIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "rfqId" TEXT,
    "poNumber" TEXT NOT NULL,
    "tradeCategoryId" TEXT NOT NULL,
    "description" TEXT,
    "status" "POStatus" NOT NULL,
    "leadTime" TEXT,
    "shipToAddress" TEXT,
    "address" TEXT,
    "expectedDate" TIMESTAMP(3),
    "deliveryDate" TIMESTAMP(3),
    "subtotal" DECIMAL(15,2) NOT NULL,
    "markupAmount" DECIMAL(15,2),
    "taxPercent" DECIMAL(65,30),
    "taxAmount" DECIMAL(15,2),
    "total" DECIMAL(15,2) NOT NULL,
    "retainagePercent" DECIMAL(65,30) DEFAULT 0,
    "paymentTerms" "PaymentTerms" NOT NULL,
    "notes" TEXT,
    "issuedBy" TEXT,
    "issuedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "cancelledBy" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderLineItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2),
    "unitPrice" DECIMAL(65,30),
    "amount" DECIMAL(65,30),
    "costCodeId" TEXT,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POAttachment" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "POAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubChangeOrder" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "scoNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "SCOStatus" NOT NULL,
    "createdBy" TEXT NOT NULL,
    "markupAmount" DOUBLE PRECISION,
    "scheduleImpactDays" INTEGER,
    "requestedBy" TEXT,
    "changeTypeId" TEXT,
    "impactsSchedule" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "voidedBy" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubChangeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SCOAttachment" (
    "id" TEXT NOT NULL,
    "scoId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SCOAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubCOLineItem" (
    "id" TEXT NOT NULL,
    "subCoid" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "description" TEXT,
    "qty" DOUBLE PRECISION NOT NULL,
    "unitId" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "categoryId" TEXT NOT NULL,
    "costCodeId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubCOLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrder_projectId_idx" ON "PurchaseOrder"("projectId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_vendorId_idx" ON "PurchaseOrder"("vendorId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_rfqId_idx" ON "PurchaseOrder"("rfqId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_tradeCategoryId_idx" ON "PurchaseOrder"("tradeCategoryId");

-- CreateIndex
CREATE INDEX "PurchaseOrderLineItem_purchaseOrderId_idx" ON "PurchaseOrderLineItem"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderLineItem_costCodeId_idx" ON "PurchaseOrderLineItem"("costCodeId");

-- CreateIndex
CREATE INDEX "PurchaseOrderLineItem_unitId_idx" ON "PurchaseOrderLineItem"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderLineItem_purchaseOrderId_lineNumber_key" ON "PurchaseOrderLineItem"("purchaseOrderId", "lineNumber");

-- CreateIndex
CREATE UNIQUE INDEX "POAttachment_documentId_key" ON "POAttachment"("documentId");

-- CreateIndex
CREATE INDEX "POAttachment_purchaseOrderId_idx" ON "POAttachment"("purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "SubChangeOrder_scoNumber_key" ON "SubChangeOrder"("scoNumber");

-- CreateIndex
CREATE INDEX "SubChangeOrder_projectId_idx" ON "SubChangeOrder"("projectId");

-- CreateIndex
CREATE INDEX "SubChangeOrder_changeTypeId_idx" ON "SubChangeOrder"("changeTypeId");

-- CreateIndex
CREATE INDEX "SubChangeOrder_scoNumber_idx" ON "SubChangeOrder"("scoNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SCOAttachment_documentId_key" ON "SCOAttachment"("documentId");

-- CreateIndex
CREATE INDEX "SCOAttachment_scoId_idx" ON "SCOAttachment"("scoId");

-- CreateIndex
CREATE INDEX "SubCOLineItem_subCoid_idx" ON "SubCOLineItem"("subCoid");

-- CreateIndex
CREATE INDEX "SubCOLineItem_unitId_idx" ON "SubCOLineItem"("unitId");

-- CreateIndex
CREATE INDEX "SubCOLineItem_categoryId_idx" ON "SubCOLineItem"("categoryId");

-- CreateIndex
CREATE INDEX "SubCOLineItem_costCodeId_idx" ON "SubCOLineItem"("costCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "SubCOLineItem_subCoid_sequenceNumber_key" ON "SubCOLineItem"("subCoid", "sequenceNumber");

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RFQ"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_tradeCategoryId_fkey" FOREIGN KEY ("tradeCategoryId") REFERENCES "Lookup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLineItem" ADD CONSTRAINT "PurchaseOrderLineItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLineItem" ADD CONSTRAINT "PurchaseOrderLineItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Lookup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POAttachment" ADD CONSTRAINT "POAttachment_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POAttachment" ADD CONSTRAINT "POAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubChangeOrder" ADD CONSTRAINT "SubChangeOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubChangeOrder" ADD CONSTRAINT "SubChangeOrder_changeTypeId_fkey" FOREIGN KEY ("changeTypeId") REFERENCES "Lookup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCOAttachment" ADD CONSTRAINT "SCOAttachment_scoId_fkey" FOREIGN KEY ("scoId") REFERENCES "SubChangeOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCOAttachment" ADD CONSTRAINT "SCOAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubCOLineItem" ADD CONSTRAINT "SubCOLineItem_subCoid_fkey" FOREIGN KEY ("subCoid") REFERENCES "SubChangeOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubCOLineItem" ADD CONSTRAINT "SubCOLineItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Lookup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubCOLineItem" ADD CONSTRAINT "SubCOLineItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Lookup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
