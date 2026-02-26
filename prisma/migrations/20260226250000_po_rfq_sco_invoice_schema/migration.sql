-- CreateEnum
CREATE TYPE "BiddingType" AS ENUM ('ANONYMOUS', 'OPEN');

-- CreateEnum
CREATE TYPE "TradeCategory" AS ENUM ('MATERIAL', 'FABRICATION', 'INSTALLATION', 'LABOR', 'EQUIPMENT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CHECK', 'ACH', 'WIRE', 'CREDIT_CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "POAttachmentType" AS ENUM ('QUOTE', 'CONTRACT', 'INSURANCE', 'DRAWING', 'SPECIFICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "SCOInitiatedBy" AS ENUM ('VENDOR', 'FIRM');

-- CreateEnum
CREATE TYPE "CostCategory" AS ENUM ('MATERIALS', 'LABOR', 'EQUIPMENT', 'SUBCONTRACTOR', 'OTHER');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('PRELIMINARY', 'FINAL', 'REVISION');

-- CreateEnum
CREATE TYPE "InvoiceCategory" AS ENUM ('MATERIALS', 'LABOR', 'EQUIPMENT', 'SUBCONTRACTOR', 'PROFESSIONAL_SERVICES', 'OTHER');

-- CreateEnum
CREATE TYPE "InvoiceAttachmentType" AS ENUM ('INVOICE_PDF', 'DELIVERY_TICKET', 'RECEIPT', 'LIEN_WAIVER', 'BACKUP_DOCUMENTATION', 'OTHER');

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_leadPMId_fkey";

-- DropForeignKey
ALTER TABLE "RFQ" DROP CONSTRAINT "RFQ_awardedVendorid_fkey";

-- DropIndex
DROP INDEX "RFQ_projectId_key";

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "amount",
DROP COLUMN "status",
DROP COLUMN "title",
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "category" "InvoiceCategory",
ADD COLUMN     "createdBy" TEXT NOT NULL,
ADD COLUMN     "disputeDate" TIMESTAMP(3),
ADD COLUMN     "disputeReason" TEXT,
ADD COLUMN     "disputeResolution" TEXT,
ADD COLUMN     "disputeResolvedDate" TIMESTAMP(3),
ADD COLUMN     "dueDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "invoiceDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "invoiceDocumentId" TEXT NOT NULL,
ADD COLUMN     "invoiceNumber" TEXT NOT NULL,
ADD COLUMN     "invoiceType" "InvoiceType" NOT NULL DEFAULT 'PRELIMINARY',
ADD COLUMN     "isDisputed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paidAmount" DECIMAL(15,2),
ADD COLUMN     "paidDate" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "paymentNotes" TEXT,
ADD COLUMN     "paymentReference" TEXT,
ADD COLUMN     "projectId" TEXT NOT NULL,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedBy" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "relatedSCOIds" TEXT[],
ADD COLUMN     "retainageAmount" DECIMAL(15,2),
ADD COLUMN     "retainagePercent" DECIMAL(65,30) DEFAULT 0,
ADD COLUMN     "retainageReleased" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "retainageReleasedDate" TIMESTAMP(3),
ADD COLUMN     "statusId" TEXT NOT NULL,
ADD COLUMN     "taxAmount" DECIMAL(15,2),
ADD COLUMN     "taxRate" DECIMAL(65,30),
ADD COLUMN     "totalAmount" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "vendorId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PrimeChangeOrder" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedBy" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "voidReason" TEXT,
ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidedBy" TEXT;

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "leadPMId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PurchaseOrder" DROP COLUMN "amount",
DROP COLUMN "status",
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "awardedQuoteId" TEXT,
ADD COLUMN     "awardedRFQVendorInviteId" TEXT,
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "contactId" TEXT,
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "issuedAt" TIMESTAMP(3),
ADD COLUMN     "issuedBy" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paymentTerms" "PaymentTerms" NOT NULL,
ADD COLUMN     "poNumber" TEXT NOT NULL,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedBy" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "retainageHeld" DECIMAL(15,2) DEFAULT 0,
ADD COLUMN     "retainagePercent" DECIMAL(65,30) DEFAULT 0,
ADD COLUMN     "revisionNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "shipToAddress" TEXT,
ADD COLUMN     "statusId" TEXT NOT NULL,
ADD COLUMN     "subtotal" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "taxAmount" DECIMAL(15,2),
ADD COLUMN     "taxPercent" DECIMAL(65,30),
ADD COLUMN     "total" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "totalCommitment" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "tradeCategory" "TradeCategory" NOT NULL,
ADD COLUMN     "vendorNotes" TEXT,
ALTER COLUMN "leadTime" DROP NOT NULL,
ALTER COLUMN "issueDate" DROP NOT NULL,
ALTER COLUMN "expectedDate" DROP NOT NULL,
ALTER COLUMN "deliveryDate" DROP NOT NULL,
ALTER COLUMN "address" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PurchaseOrderCO" DROP COLUMN "reason",
DROP COLUMN "total",
ADD COLUMN     "amount" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "changeTypeId" TEXT,
ADD COLUMN     "closeoutJustification" TEXT,
ADD COLUMN     "costCodeId" TEXT,
ADD COLUMN     "createdBy" TEXT NOT NULL,
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "detailedScope" TEXT,
ADD COLUMN     "initiatedBy" "SCOInitiatedBy" NOT NULL,
ADD COLUMN     "linkedPCOId" TEXT,
ADD COLUMN     "priority" "ChangeOrderPriority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "projectId" TEXT NOT NULL,
ADD COLUMN     "reasonForChange" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedBy" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "rfqId" TEXT,
ADD COLUMN     "scheduleImpactDays" INTEGER,
ADD COLUMN     "scoNumber" TEXT NOT NULL,
ADD COLUMN     "statusId" TEXT NOT NULL,
ADD COLUMN     "vendorContactEmail" TEXT,
ADD COLUMN     "vendorContactName" TEXT,
ADD COLUMN     "vendorId" TEXT NOT NULL,
ADD COLUMN     "vendorReferenceNumber" TEXT,
ADD COLUMN     "voidReason" TEXT,
ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidedBy" TEXT;

-- AlterTable
ALTER TABLE "PurchaseOrderCOLineItem" DROP COLUMN "price",
ADD COLUMN     "costCategory" "CostCategory",
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "lineNumber" INTEGER NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "poLineItemId" TEXT,
ADD COLUMN     "unitPrice" DECIMAL(65,30),
ALTER COLUMN "quantity" DROP NOT NULL,
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "costCodeId" DROP NOT NULL,
ALTER COLUMN "amount" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PurchaseOrderLineItem" DROP COLUMN "price",
DROP COLUMN "title",
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "lineNumber" INTEGER NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "rfqDeliverableId" TEXT,
ADD COLUMN     "unitPrice" DECIMAL(65,30),
ALTER COLUMN "quantity" DROP NOT NULL,
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "costCodeId" DROP NOT NULL,
ALTER COLUMN "amount" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RFQ" DROP COLUMN "awardedVendorid",
DROP COLUMN "deadline",
DROP COLUMN "status",
ADD COLUMN     "awardedAt" TIMESTAMP(3),
ADD COLUMN     "awardedBy" TEXT,
ADD COLUMN     "awardedVendorId" TEXT,
ADD COLUMN     "bidDeadline" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "biddingType" "BiddingType" NOT NULL DEFAULT 'ANONYMOUS',
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "estimatedBudget" DECIMAL(15,2),
ADD COLUMN     "generatedPOId" TEXT,
ADD COLUMN     "minimumVendors" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "publishedBy" TEXT,
ADD COLUMN     "rfqNumber" TEXT NOT NULL,
ADD COLUMN     "statusId" TEXT NOT NULL,
ALTER COLUMN "costCodeId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RFQDeliverable" DROP COLUMN "title",
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "estimatedTotal" DECIMAL(15,2),
ADD COLUMN     "estimatedUnitPrice" DECIMAL(15,2),
ADD COLUMN     "sequenceNumber" INTEGER NOT NULL,
ADD COLUMN     "specifications" TEXT,
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "costCodeId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "VendorQuotation" DROP COLUMN "amount",
DROP COLUMN "status",
ADD COLUMN     "deliveryDate" TIMESTAMP(3),
ADD COLUMN     "enteredBy" TEXT NOT NULL,
ADD COLUMN     "grandTotal" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "isAwarded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isResponsive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "leadTimeDays" INTEGER,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "qualifications" TEXT,
ADD COLUMN     "quoteValidDays" INTEGER,
ADD COLUMN     "quoteValidUntil" TIMESTAMP(3),
ADD COLUMN     "statusId" TEXT NOT NULL,
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "submittedBy" TEXT,
ADD COLUMN     "submittedByEmail" TEXT,
ADD COLUMN     "submittedByPhone" TEXT,
ADD COLUMN     "taxAmount" DECIMAL(15,2),
ADD COLUMN     "totalAmount" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "warrantyPeriod" TEXT,
ALTER COLUMN "leadTime" DROP NOT NULL;

-- DropEnum
DROP TYPE "InvoiceStatus";

-- DropEnum
DROP TYPE "PurchaseOrderStatus";

-- DropEnum
DROP TYPE "QuotationStatus";

-- DropEnum
DROP TYPE "RFQStatus";

-- CreateTable
CREATE TABLE "PrimeContractAttachment" (
    "id" TEXT NOT NULL,
    "primeContractId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrimeContractAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RFQStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RFQStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddendumChangeType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddendumChangeType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RFQVendorInvite" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inviteEmailSentAt" TIMESTAMP(3),
    "inviteEmailStatus" TEXT,
    "reminderEmailSentAt" TIMESTAMP(3),
    "hasSubmittedQuote" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "declinedToQuote" BOOLEAN NOT NULL DEFAULT false,
    "declinedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RFQVendorInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteLineItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "lineTotal" DECIMAL(15,2) NOT NULL,
    "notes" TEXT,
    "alternateProposed" BOOLEAN NOT NULL DEFAULT false,
    "alternateDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteLineItem_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "QuoteAttachment" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RFQAddendum" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "addendumNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "changeTypeId" TEXT NOT NULL,
    "changesDescription" TEXT NOT NULL,
    "impactsDeadline" BOOLEAN NOT NULL DEFAULT false,
    "newBidDeadline" TIMESTAMP(3),
    "impactsScope" BOOLEAN NOT NULL DEFAULT false,
    "impactsPricing" BOOLEAN NOT NULL DEFAULT false,
    "issuedBy" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requiresAcknowledgment" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RFQAddendum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "POStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POStatusHistory" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "fromStatusId" TEXT,
    "toStatusId" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "onBehalfOf" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "POStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POAttachment" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "attachmentType" "POAttachmentType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "POAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POPayment" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "paymentMethod" "PaymentMethod",
    "invoiceId" TEXT,
    "recordedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "POPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SCOChangeType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SCOChangeType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SCOStatusHistory" (
    "id" TEXT NOT NULL,
    "scoId" TEXT NOT NULL,
    "fromStatusId" TEXT,
    "toStatusId" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "onBehalfOf" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SCOStatusHistory_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "InvoiceStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "poLineItemId" TEXT,
    "description" TEXT NOT NULL,
    "qty" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "costCodeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceAttachment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "attachmentType" "InvoiceAttachmentType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrimeContractAttachment_primeContractId_idx" ON "PrimeContractAttachment"("primeContractId");

-- CreateIndex
CREATE UNIQUE INDEX "RFQStatus_name_key" ON "RFQStatus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RFQStatus_order_key" ON "RFQStatus"("order");

-- CreateIndex
CREATE UNIQUE INDEX "AddendumChangeType_name_key" ON "AddendumChangeType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AddendumChangeType_code_key" ON "AddendumChangeType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AddendumChangeType_order_key" ON "AddendumChangeType"("order");

-- CreateIndex
CREATE INDEX "RFQVendorInvite_rfqId_idx" ON "RFQVendorInvite"("rfqId");

-- CreateIndex
CREATE INDEX "RFQVendorInvite_vendorId_idx" ON "RFQVendorInvite"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "RFQVendorInvite_rfqId_vendorId_key" ON "RFQVendorInvite"("rfqId", "vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteStatus_name_key" ON "QuoteStatus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteStatus_order_key" ON "QuoteStatus"("order");

-- CreateIndex
CREATE INDEX "QuoteLineItem_quoteId_idx" ON "QuoteLineItem"("quoteId");

-- CreateIndex
CREATE INDEX "QuoteLineItem_deliverableId_idx" ON "QuoteLineItem"("deliverableId");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteLineItem_quoteId_deliverableId_key" ON "QuoteLineItem"("quoteId", "deliverableId");

-- CreateIndex
CREATE INDEX "RFQAttachment_rfqId_idx" ON "RFQAttachment"("rfqId");

-- CreateIndex
CREATE INDEX "QuoteAttachment_quoteId_idx" ON "QuoteAttachment"("quoteId");

-- CreateIndex
CREATE INDEX "RFQAddendum_rfqId_idx" ON "RFQAddendum"("rfqId");

-- CreateIndex
CREATE UNIQUE INDEX "RFQAddendum_rfqId_addendumNumber_key" ON "RFQAddendum"("rfqId", "addendumNumber");

-- CreateIndex
CREATE UNIQUE INDEX "POStatus_name_key" ON "POStatus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "POStatus_order_key" ON "POStatus"("order");

-- CreateIndex
CREATE INDEX "POStatusHistory_purchaseOrderId_idx" ON "POStatusHistory"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "POAttachment_purchaseOrderId_idx" ON "POAttachment"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "POPayment_purchaseOrderId_idx" ON "POPayment"("purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "SCOChangeType_name_key" ON "SCOChangeType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SCOChangeType_code_key" ON "SCOChangeType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SCOChangeType_order_key" ON "SCOChangeType"("order");

-- CreateIndex
CREATE INDEX "SCOStatusHistory_scoId_idx" ON "SCOStatusHistory"("scoId");

-- CreateIndex
CREATE INDEX "SCOAttachment_scoId_idx" ON "SCOAttachment"("scoId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceStatus_name_key" ON "InvoiceStatus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceStatus_order_key" ON "InvoiceStatus"("order");

-- CreateIndex
CREATE INDEX "InvoiceLineItem_invoiceId_idx" ON "InvoiceLineItem"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceLineItem_poLineItemId_idx" ON "InvoiceLineItem"("poLineItemId");

-- CreateIndex
CREATE INDEX "InvoiceAttachment_invoiceId_idx" ON "InvoiceAttachment"("invoiceId");

-- CreateIndex
CREATE INDEX "Invoice_projectId_idx" ON "Invoice"("projectId");

-- CreateIndex
CREATE INDEX "Invoice_vendorId_idx" ON "Invoice"("vendorId");

-- CreateIndex
CREATE INDEX "Invoice_purchaseOrderId_idx" ON "Invoice"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "Invoice_statusId_idx" ON "Invoice"("statusId");

-- CreateIndex
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice"("dueDate");

-- CreateIndex
CREATE INDEX "Invoice_invoiceDate_idx" ON "Invoice"("invoiceDate");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_vendorId_key" ON "Invoice"("invoiceNumber", "vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrder_projectId_idx" ON "PurchaseOrder"("projectId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_vendorId_idx" ON "PurchaseOrder"("vendorId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_statusId_idx" ON "PurchaseOrder"("statusId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_issueDate_idx" ON "PurchaseOrder"("issueDate");

-- CreateIndex
CREATE INDEX "PurchaseOrder_rfqId_idx" ON "PurchaseOrder"("rfqId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderCO_scoNumber_key" ON "PurchaseOrderCO"("scoNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderCO_purchaseOrderId_idx" ON "PurchaseOrderCO"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderCO_projectId_idx" ON "PurchaseOrderCO"("projectId");

-- CreateIndex
CREATE INDEX "PurchaseOrderCO_vendorId_idx" ON "PurchaseOrderCO"("vendorId");

-- CreateIndex
CREATE INDEX "PurchaseOrderCO_statusId_idx" ON "PurchaseOrderCO"("statusId");

-- CreateIndex
CREATE INDEX "PurchaseOrderCO_date_idx" ON "PurchaseOrderCO"("date");

-- CreateIndex
CREATE INDEX "PurchaseOrderCOLineItem_pcoId_idx" ON "PurchaseOrderCOLineItem"("pcoId");

-- CreateIndex
CREATE INDEX "PurchaseOrderCOLineItem_poLineItemId_idx" ON "PurchaseOrderCOLineItem"("poLineItemId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderCOLineItem_pcoId_lineNumber_key" ON "PurchaseOrderCOLineItem"("pcoId", "lineNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderLineItem_purchaseOrderId_idx" ON "PurchaseOrderLineItem"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderLineItem_costCodeId_idx" ON "PurchaseOrderLineItem"("costCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderLineItem_purchaseOrderId_lineNumber_key" ON "PurchaseOrderLineItem"("purchaseOrderId", "lineNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RFQ_rfqNumber_key" ON "RFQ"("rfqNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RFQ_generatedPOId_key" ON "RFQ"("generatedPOId");

-- CreateIndex
CREATE INDEX "RFQ_projectId_idx" ON "RFQ"("projectId");

-- CreateIndex
CREATE INDEX "RFQ_statusId_idx" ON "RFQ"("statusId");

-- CreateIndex
CREATE INDEX "RFQ_bidDeadline_idx" ON "RFQ"("bidDeadline");

-- CreateIndex
CREATE INDEX "RFQDeliverable_rfqId_idx" ON "RFQDeliverable"("rfqId");

-- CreateIndex
CREATE UNIQUE INDEX "RFQDeliverable_rfqId_sequenceNumber_key" ON "RFQDeliverable"("rfqId", "sequenceNumber");

-- CreateIndex
CREATE INDEX "VendorQuotation_rfqId_idx" ON "VendorQuotation"("rfqId");

-- CreateIndex
CREATE INDEX "VendorQuotation_vendorId_idx" ON "VendorQuotation"("vendorId");

-- CreateIndex
CREATE INDEX "VendorQuotation_statusId_idx" ON "VendorQuotation"("statusId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorQuotation_rfqId_vendorId_key" ON "VendorQuotation"("rfqId", "vendorId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_leadPMId_fkey" FOREIGN KEY ("leadPMId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrimeContractAttachment" ADD CONSTRAINT "PrimeContractAttachment_primeContractId_fkey" FOREIGN KEY ("primeContractId") REFERENCES "PrimeContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrimeContractAttachment" ADD CONSTRAINT "PrimeContractAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQ" ADD CONSTRAINT "RFQ_costCodeId_fkey" FOREIGN KEY ("costCodeId") REFERENCES "CostCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQ" ADD CONSTRAINT "RFQ_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "RFQStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQ" ADD CONSTRAINT "RFQ_awardedVendorId_fkey" FOREIGN KEY ("awardedVendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQ" ADD CONSTRAINT "RFQ_generatedPOId_fkey" FOREIGN KEY ("generatedPOId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQVendorInvite" ADD CONSTRAINT "RFQVendorInvite_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RFQ"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQVendorInvite" ADD CONSTRAINT "RFQVendorInvite_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorQuotation" ADD CONSTRAINT "VendorQuotation_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "QuoteStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLineItem" ADD CONSTRAINT "QuoteLineItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "VendorQuotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLineItem" ADD CONSTRAINT "QuoteLineItem_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "RFQDeliverable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQAttachment" ADD CONSTRAINT "RFQAttachment_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RFQ"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQAttachment" ADD CONSTRAINT "RFQAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteAttachment" ADD CONSTRAINT "QuoteAttachment_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "VendorQuotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteAttachment" ADD CONSTRAINT "QuoteAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQAddendum" ADD CONSTRAINT "RFQAddendum_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RFQ"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQAddendum" ADD CONSTRAINT "RFQAddendum_changeTypeId_fkey" FOREIGN KEY ("changeTypeId") REFERENCES "AddendumChangeType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "POStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_awardedRFQVendorInviteId_fkey" FOREIGN KEY ("awardedRFQVendorInviteId") REFERENCES "RFQVendorInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_awardedQuoteId_fkey" FOREIGN KEY ("awardedQuoteId") REFERENCES "VendorQuotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POStatusHistory" ADD CONSTRAINT "POStatusHistory_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POStatusHistory" ADD CONSTRAINT "POStatusHistory_fromStatusId_fkey" FOREIGN KEY ("fromStatusId") REFERENCES "POStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POStatusHistory" ADD CONSTRAINT "POStatusHistory_toStatusId_fkey" FOREIGN KEY ("toStatusId") REFERENCES "POStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLineItem" ADD CONSTRAINT "PurchaseOrderLineItem_rfqDeliverableId_fkey" FOREIGN KEY ("rfqDeliverableId") REFERENCES "RFQDeliverable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POAttachment" ADD CONSTRAINT "POAttachment_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POAttachment" ADD CONSTRAINT "POAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POPayment" ADD CONSTRAINT "POPayment_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderCO" ADD CONSTRAINT "PurchaseOrderCO_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderCO" ADD CONSTRAINT "PurchaseOrderCO_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderCO" ADD CONSTRAINT "PurchaseOrderCO_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ChangeOrderStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderCO" ADD CONSTRAINT "PurchaseOrderCO_changeTypeId_fkey" FOREIGN KEY ("changeTypeId") REFERENCES "SCOChangeType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderCO" ADD CONSTRAINT "PurchaseOrderCO_costCodeId_fkey" FOREIGN KEY ("costCodeId") REFERENCES "CostCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderCO" ADD CONSTRAINT "PurchaseOrderCO_linkedPCOId_fkey" FOREIGN KEY ("linkedPCOId") REFERENCES "PrimeChangeOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderCO" ADD CONSTRAINT "PurchaseOrderCO_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RFQ"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCOStatusHistory" ADD CONSTRAINT "SCOStatusHistory_scoId_fkey" FOREIGN KEY ("scoId") REFERENCES "PurchaseOrderCO"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCOStatusHistory" ADD CONSTRAINT "SCOStatusHistory_fromStatusId_fkey" FOREIGN KEY ("fromStatusId") REFERENCES "ChangeOrderStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCOStatusHistory" ADD CONSTRAINT "SCOStatusHistory_toStatusId_fkey" FOREIGN KEY ("toStatusId") REFERENCES "ChangeOrderStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderCOLineItem" ADD CONSTRAINT "PurchaseOrderCOLineItem_poLineItemId_fkey" FOREIGN KEY ("poLineItemId") REFERENCES "PurchaseOrderLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCOAttachment" ADD CONSTRAINT "SCOAttachment_scoId_fkey" FOREIGN KEY ("scoId") REFERENCES "PurchaseOrderCO"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCOAttachment" ADD CONSTRAINT "SCOAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "InvoiceStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_invoiceDocumentId_fkey" FOREIGN KEY ("invoiceDocumentId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_poLineItemId_fkey" FOREIGN KEY ("poLineItemId") REFERENCES "PurchaseOrderLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceAttachment" ADD CONSTRAINT "InvoiceAttachment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceAttachment" ADD CONSTRAINT "InvoiceAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

