-- CreateEnum
CREATE TYPE "RFQStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'AWARDED', 'VOID');

-- CreateEnum
CREATE TYPE "BiddingType" AS ENUM ('ANONYMOUS', 'OPEN');

-- AlterEnum
ALTER TYPE "ProtectedFolderType" ADD VALUE 'SCHEDULE';

-- CreateTable
CREATE TABLE "RFQ" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "rfqNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "RFQStatus" NOT NULL DEFAULT 'DRAFT',
    "bidDeadline" DATE NOT NULL,
    "typeId" TEXT NOT NULL,
    "awardedVendorId" TEXT,
    "awardedAmount" DECIMAL(15,2),
    "cancellationReason" TEXT,
    "createdBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RFQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RFQAttachment" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RFQAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RFQDeliverable" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "costCodeId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RFQDeliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RFQVendorQuote" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "hasSubmittedQuote" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "declinedToQuote" BOOLEAN NOT NULL DEFAULT false,
    "declineReason" TEXT,
    "quotedAmount" DECIMAL(15,2),
    "leadTime" TEXT,
    "isAwarded" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RFQVendorQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorQuoteAttachment" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorQuoteAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RFQ_rfqNumber_key" ON "RFQ"("rfqNumber");

-- CreateIndex
CREATE INDEX "RFQ_projectId_idx" ON "RFQ"("projectId");

-- CreateIndex
CREATE INDEX "RFQ_bidDeadline_idx" ON "RFQ"("bidDeadline");

-- CreateIndex
CREATE UNIQUE INDEX "RFQAttachment_documentId_key" ON "RFQAttachment"("documentId");

-- CreateIndex
CREATE INDEX "RFQAttachment_rfqId_idx" ON "RFQAttachment"("rfqId");

-- CreateIndex
CREATE INDEX "RFQDeliverable_rfqId_idx" ON "RFQDeliverable"("rfqId");

-- CreateIndex
CREATE INDEX "RFQVendorQuote_rfqId_idx" ON "RFQVendorQuote"("rfqId");

-- CreateIndex
CREATE INDEX "RFQVendorQuote_vendorId_idx" ON "RFQVendorQuote"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "RFQVendorQuote_rfqId_vendorId_key" ON "RFQVendorQuote"("rfqId", "vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorQuoteAttachment_documentId_key" ON "VendorQuoteAttachment"("documentId");

-- CreateIndex
CREATE INDEX "VendorQuoteAttachment_quoteId_idx" ON "VendorQuoteAttachment"("quoteId");

-- AddForeignKey
ALTER TABLE "RFQ" ADD CONSTRAINT "RFQ_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQ" ADD CONSTRAINT "RFQ_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "Lookup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQ" ADD CONSTRAINT "RFQ_awardedVendorId_fkey" FOREIGN KEY ("awardedVendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQAttachment" ADD CONSTRAINT "RFQAttachment_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RFQ"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQAttachment" ADD CONSTRAINT "RFQAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQDeliverable" ADD CONSTRAINT "RFQDeliverable_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RFQ"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQDeliverable" ADD CONSTRAINT "RFQDeliverable_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Lookup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQVendorQuote" ADD CONSTRAINT "RFQVendorQuote_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RFQ"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQVendorQuote" ADD CONSTRAINT "RFQVendorQuote_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorQuoteAttachment" ADD CONSTRAINT "VendorQuoteAttachment_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "RFQVendorQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorQuoteAttachment" ADD CONSTRAINT "VendorQuoteAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
