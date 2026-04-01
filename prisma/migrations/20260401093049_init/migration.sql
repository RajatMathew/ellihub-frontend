-- CreateEnum
CREATE TYPE "PaymentTerms" AS ENUM ('NET_15', 'NET_30', 'NET_45', 'NET_60', 'NET_90', 'DUE_ON_RECEIPT');

-- CreateEnum
CREATE TYPE "VendorType" AS ENUM ('MATERIAL', 'FABRICATION', 'INSTALLATION');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLACKLISTED', 'PROSPECT');

-- CreateEnum
CREATE TYPE "GCStatus" AS ENUM ('ACTIVE', 'PROSPECTING', 'INACTIVE', 'BLACKLISTED');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('FILE', 'FOLDER');

-- CreateEnum
CREATE TYPE "ProtectedFolderType" AS ENUM ('PROJECT_ROOT', 'INVOICE', 'RFQ', 'PURCHASE_ORDER', 'PURCHASE_ORDER_CO', 'PRIME_CO', 'PRIME_CONTRACT');

-- CreateEnum
CREATE TYPE "FilePermission" AS ENUM ('DELETE', 'READ', 'DOWNLOAD', 'CHANGE_PERMISSION', 'ACCESS', 'CREATE_FILE_WITHIN');

-- CreateEnum
CREATE TYPE "ProjectDivision" AS ENUM ('SCA', 'DDC', 'CIVIL', 'INSTITUTIONAL');

-- CreateEnum
CREATE TYPE "ChangeOrderPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

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

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" TEXT,
    "banned" BOOLEAN DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),
    "profile" TEXT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "activeOrganizationId" TEXT,
    "impersonatedBy" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "metadata" TEXT,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inviterId" TEXT NOT NULL,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizationRole" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "organizationRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "VendorType" NOT NULL,
    "categoryTags" TEXT[],
    "taxId" TEXT,
    "status" "VendorStatus" NOT NULL,
    "address" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "paymentTerms" "PaymentTerms" NOT NULL DEFAULT 'NET_30',
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GCType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GCType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneralContractor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gcTypeId" TEXT NOT NULL,
    "status" "GCStatus" NOT NULL DEFAULT 'ACTIVE',
    "address" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "paymentTerms" "PaymentTerms" NOT NULL DEFAULT 'NET_30',
    "retainagePercent" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneralContractor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "professionalRoleId" TEXT,
    "email" JSONB,
    "phoneNumber" JSONB,
    "tags" TEXT[],
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactVendor" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactVendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactGC" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "generalContractorId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactGC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostCodeCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostCodeCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostCode" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default',
    "description" TEXT NOT NULL DEFAULT '',
    "costCodeCategoryId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objectId" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "parentId" TEXT,
    "type" "FileType" NOT NULL,
    "protectedFolderType" "ProtectedFolderType",
    "isDeletable" BOOLEAN NOT NULL DEFAULT true,
    "private" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileAccess" (
    "fileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissions" "FilePermission"[],

    CONSTRAINT "FileAccess_pkey" PRIMARY KEY ("fileId","userId")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "userId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "jobNumber" TEXT,
    "contractNumber" TEXT,
    "stageId" TEXT NOT NULL,
    "division" "ProjectDivision" NOT NULL,
    "statusId" TEXT NOT NULL,
    "streetAddress" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "effectiveStartDate" TIMESTAMP(3),
    "effectiveEndDate" TIMESTAMP(3),
    "gcId" TEXT NOT NULL,
    "leadPMId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectStage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrimeContract" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "contractValue" DECIMAL(65,30) NOT NULL,
    "contractType" TEXT,
    "retainagePercent" DECIMAL(5,2),
    "targetBudgetPercent" DECIMAL(5,2),
    "paymentTerms" "PaymentTerms",
    "estimatedStartDate" TIMESTAMP(3),
    "estimatedCompletionDate" TIMESTAMP(3),
    "actualStartDate" TIMESTAMP(3),
    "actualCompletionDate" TIMESTAMP(3),
    "executedContractDocId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrimeContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrimeContractAttachment" (
    "id" TEXT NOT NULL,
    "primeContractId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrimeContractAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTeamAssignment" (
    "projectId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTeamAssignment_pkey" PRIMARY KEY ("projectId","employeeId")
);

-- CreateTable
CREATE TABLE "ProjectScheduleEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "adjustedStartDate" TIMESTAMP(3),
    "adjustedFinishDate" TIMESTAMP(3),
    "notes" TEXT,
    "fileId" TEXT,
    "changeOrderId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectScheduleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeOrderStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangeOrderStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PCOChangeType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PCOChangeType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrimeChangeOrder" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "pcoNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "statusId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT NOT NULL,
    "markupAmount" DOUBLE PRECISION,
    "scheduleImpactDays" INTEGER,
    "requestedBy" TEXT,
    "estimatedCost" DOUBLE PRECISION,
    "estimatedMargin" DOUBLE PRECISION,
    "estimatedMarginPercent" DOUBLE PRECISION,
    "changeTypeId" TEXT,
    "priority" "ChangeOrderPriority" NOT NULL DEFAULT 'MEDIUM',
    "impactsSchedule" BOOLEAN NOT NULL DEFAULT false,
    "costCodeId" TEXT,
    "contactId" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "voidedBy" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "supersededBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrimeChangeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PCOStatusHistory" (
    "id" TEXT NOT NULL,
    "pcoId" TEXT NOT NULL,
    "fromStatusId" TEXT,
    "toStatusId" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "onBehalfOf" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PCOStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PCOAttachment" (
    "id" TEXT NOT NULL,
    "pcoId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PCOAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrimeCOLineItem" (
    "id" TEXT NOT NULL,
    "primeCoid" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "costCodeId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrimeCOLineItem_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "RFQ" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "rfqNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "costCodeId" TEXT,
    "statusId" TEXT NOT NULL,
    "bidDeadline" TIMESTAMP(3) NOT NULL,
    "estimatedBudget" DECIMAL(15,2),
    "biddingType" "BiddingType" NOT NULL DEFAULT 'ANONYMOUS',
    "minimumVendors" INTEGER NOT NULL DEFAULT 3,
    "awardedVendorId" TEXT,
    "awardedAmount" DECIMAL(15,2),
    "generatedPOId" TEXT,
    "publishedBy" TEXT,
    "publishedAt" TIMESTAMP(3),
    "awardedBy" TEXT,
    "awardedAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RFQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RFQDeliverable" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "costCodeId" TEXT,
    "specifications" TEXT,
    "estimatedUnitPrice" DECIMAL(15,2),
    "estimatedTotal" DECIMAL(15,2),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RFQDeliverable_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "VendorQuotation" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "enteredBy" TEXT NOT NULL,
    "submittedBy" TEXT,
    "submittedByEmail" TEXT,
    "submittedByPhone" TEXT,
    "submittedAt" TIMESTAMP(3),
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "taxAmount" DECIMAL(15,2),
    "grandTotal" DECIMAL(15,2) NOT NULL,
    "leadTime" TEXT,
    "leadTimeDays" INTEGER,
    "deliveryDate" TIMESTAMP(3),
    "paymentTerms" TEXT,
    "warrantyPeriod" TEXT,
    "quoteValidDays" INTEGER,
    "quoteValidUntil" TIMESTAMP(3),
    "notes" TEXT,
    "qualifications" TEXT,
    "isResponsive" BOOLEAN NOT NULL DEFAULT true,
    "isAwarded" BOOLEAN NOT NULL DEFAULT false,
    "statusId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorQuotation_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "rfqId" TEXT,
    "poNumber" TEXT NOT NULL,
    "tradeCategory" "TradeCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "statusId" TEXT NOT NULL,
    "leadTime" TEXT,
    "contactId" TEXT,
    "shipToAddress" TEXT,
    "address" TEXT,
    "issueDate" TIMESTAMP(3),
    "expectedDate" TIMESTAMP(3),
    "deliveryDate" TIMESTAMP(3),
    "subtotal" DECIMAL(15,2) NOT NULL,
    "taxPercent" DECIMAL(65,30),
    "taxAmount" DECIMAL(15,2),
    "total" DECIMAL(15,2) NOT NULL,
    "totalCommitment" DECIMAL(15,2) NOT NULL,
    "retainagePercent" DECIMAL(65,30) DEFAULT 0,
    "retainageHeld" DECIMAL(15,2) DEFAULT 0,
    "paymentTerms" "PaymentTerms" NOT NULL,
    "notes" TEXT,
    "vendorNotes" TEXT,
    "revisionNumber" INTEGER NOT NULL DEFAULT 1,
    "awardedRFQVendorInviteId" TEXT,
    "awardedQuoteId" TEXT,
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
CREATE TABLE "PurchaseOrderLineItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(10,2),
    "unitPrice" DECIMAL(65,30),
    "amount" DECIMAL(65,30),
    "costCodeId" TEXT,
    "notes" TEXT,
    "rfqDeliverableId" TEXT,
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
    "attachmentType" "POAttachmentType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "POAttachment_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "PurchaseOrderCO" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "scoNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "statusId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "reasonForChange" TEXT,
    "detailedScope" TEXT,
    "scheduleImpactDays" INTEGER,
    "createdBy" TEXT NOT NULL,
    "vendorContactName" TEXT,
    "vendorContactEmail" TEXT,
    "vendorReferenceNumber" TEXT,
    "changeTypeId" TEXT,
    "initiatedBy" "SCOInitiatedBy" NOT NULL,
    "priority" "ChangeOrderPriority" NOT NULL DEFAULT 'MEDIUM',
    "costCodeId" TEXT,
    "linkedPCOId" TEXT,
    "rfqId" TEXT,
    "closeoutJustification" TEXT,
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

    CONSTRAINT "PurchaseOrderCO_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "PurchaseOrderCOLineItem" (
    "id" TEXT NOT NULL,
    "pcoId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(10,2),
    "unitPrice" DECIMAL(65,30),
    "amount" DECIMAL(65,30),
    "costCodeId" TEXT,
    "costCategory" "CostCategory",
    "notes" TEXT,
    "poLineItemId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderCOLineItem_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "statusId" TEXT NOT NULL,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "invoiceType" "InvoiceType" NOT NULL DEFAULT 'PRELIMINARY',
    "category" "InvoiceCategory",
    "notes" TEXT,
    "invoiceDocumentId" TEXT,
    "createdBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "retainagePercent" DECIMAL(65,30) DEFAULT 0,
    "retainageAmount" DECIMAL(15,2),
    "retainageReleased" BOOLEAN NOT NULL DEFAULT false,
    "retainageReleasedDate" TIMESTAMP(3),
    "taxAmount" DECIMAL(15,2),
    "taxRate" DECIMAL(65,30),
    "paidAmount" DECIMAL(15,2),
    "paidDate" TIMESTAMP(3),
    "paymentReference" TEXT,
    "paymentMethod" "PaymentMethod",
    "paymentNotes" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "isDisputed" BOOLEAN NOT NULL DEFAULT false,
    "disputeReason" TEXT,
    "disputeDate" TIMESTAMP(3),
    "disputeResolvedDate" TIMESTAMP(3),
    "disputeResolution" TEXT,
    "relatedSCOIds" TEXT[],
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "Configuration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "parent" TEXT,
    "child" TEXT,
    "key1" TEXT,
    "key2" TEXT,

    CONSTRAINT "Configuration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "organization"("slug");

-- CreateIndex
CREATE INDEX "member_organizationId_idx" ON "member"("organizationId");

-- CreateIndex
CREATE INDEX "member_userId_idx" ON "member"("userId");

-- CreateIndex
CREATE INDEX "invitation_organizationId_idx" ON "invitation"("organizationId");

-- CreateIndex
CREATE INDEX "invitation_email_idx" ON "invitation"("email");

-- CreateIndex
CREATE INDEX "organizationRole_organizationId_idx" ON "organizationRole"("organizationId");

-- CreateIndex
CREATE INDEX "organizationRole_role_idx" ON "organizationRole"("role");

-- CreateIndex
CREATE INDEX "Vendor_name_idx" ON "Vendor"("name");

-- CreateIndex
CREATE INDEX "Vendor_status_idx" ON "Vendor"("status");

-- CreateIndex
CREATE INDEX "Vendor_type_idx" ON "Vendor"("type");

-- CreateIndex
CREATE UNIQUE INDEX "GCType_name_key" ON "GCType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GCType_code_key" ON "GCType"("code");

-- CreateIndex
CREATE INDEX "GCType_name_idx" ON "GCType"("name");

-- CreateIndex
CREATE INDEX "GCType_code_idx" ON "GCType"("code");

-- CreateIndex
CREATE INDEX "GeneralContractor_name_idx" ON "GeneralContractor"("name");

-- CreateIndex
CREATE INDEX "GeneralContractor_status_idx" ON "GeneralContractor"("status");

-- CreateIndex
CREATE INDEX "GeneralContractor_gcTypeId_idx" ON "GeneralContractor"("gcTypeId");

-- CreateIndex
CREATE INDEX "GeneralContractor_deletedAt_idx" ON "GeneralContractor"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalRole_name_key" ON "ProfessionalRole"("name");

-- CreateIndex
CREATE INDEX "Contact_fullName_idx" ON "Contact"("fullName");

-- CreateIndex
CREATE INDEX "Contact_deletedAt_idx" ON "Contact"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContactVendor_contactId_vendorId_key" ON "ContactVendor"("contactId", "vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactGC_contactId_generalContractorId_key" ON "ContactGC"("contactId", "generalContractorId");

-- CreateIndex
CREATE INDEX "CostCodeCategory_deletedAt_idx" ON "CostCodeCategory"("deletedAt");

-- CreateIndex
CREATE INDEX "CostCodeCategory_tenantId_idx" ON "CostCodeCategory"("tenantId");

-- CreateIndex
CREATE INDEX "CostCode_code_idx" ON "CostCode"("code");

-- CreateIndex
CREATE INDEX "CostCode_deletedAt_idx" ON "CostCode"("deletedAt");

-- CreateIndex
CREATE INDEX "CostCode_tenantId_idx" ON "CostCode"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CostCode_code_tenantId_key" ON "CostCode"("code", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Project_jobNumber_key" ON "Project"("jobNumber");

-- CreateIndex
CREATE INDEX "Project_stageId_idx" ON "Project"("stageId");

-- CreateIndex
CREATE INDEX "Project_statusId_idx" ON "Project"("statusId");

-- CreateIndex
CREATE INDEX "Project_division_idx" ON "Project"("division");

-- CreateIndex
CREATE INDEX "Project_gcId_idx" ON "Project"("gcId");

-- CreateIndex
CREATE INDEX "Project_leadPMId_idx" ON "Project"("leadPMId");

-- CreateIndex
CREATE INDEX "Project_effectiveStartDate_idx" ON "Project"("effectiveStartDate");

-- CreateIndex
CREATE INDEX "Project_effectiveEndDate_idx" ON "Project"("effectiveEndDate");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectStage_name_key" ON "ProjectStage"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectStage_code_key" ON "ProjectStage"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectStatus_name_key" ON "ProjectStatus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectStatus_order_key" ON "ProjectStatus"("order");

-- CreateIndex
CREATE UNIQUE INDEX "PrimeContract_projectId_key" ON "PrimeContract"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "PrimeContract_executedContractDocId_key" ON "PrimeContract"("executedContractDocId");

-- CreateIndex
CREATE UNIQUE INDEX "PrimeContractAttachment_documentId_key" ON "PrimeContractAttachment"("documentId");

-- CreateIndex
CREATE INDEX "PrimeContractAttachment_primeContractId_idx" ON "PrimeContractAttachment"("primeContractId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectScheduleEntry_fileId_key" ON "ProjectScheduleEntry"("fileId");

-- CreateIndex
CREATE INDEX "ProjectScheduleEntry_projectId_idx" ON "ProjectScheduleEntry"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ChangeOrderStatus_name_key" ON "ChangeOrderStatus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ChangeOrderStatus_order_key" ON "ChangeOrderStatus"("order");

-- CreateIndex
CREATE UNIQUE INDEX "PCOChangeType_name_key" ON "PCOChangeType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PCOChangeType_code_key" ON "PCOChangeType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PCOChangeType_order_key" ON "PCOChangeType"("order");

-- CreateIndex
CREATE UNIQUE INDEX "PrimeChangeOrder_pcoNumber_key" ON "PrimeChangeOrder"("pcoNumber");

-- CreateIndex
CREATE INDEX "PrimeChangeOrder_projectId_statusId_date_idx" ON "PrimeChangeOrder"("projectId", "statusId", "date");

-- CreateIndex
CREATE INDEX "PrimeChangeOrder_pcoNumber_idx" ON "PrimeChangeOrder"("pcoNumber");

-- CreateIndex
CREATE INDEX "PCOStatusHistory_pcoId_idx" ON "PCOStatusHistory"("pcoId");

-- CreateIndex
CREATE UNIQUE INDEX "PCOAttachment_documentId_key" ON "PCOAttachment"("documentId");

-- CreateIndex
CREATE INDEX "PCOAttachment_pcoId_idx" ON "PCOAttachment"("pcoId");

-- CreateIndex
CREATE INDEX "PrimeCOLineItem_primeCoid_idx" ON "PrimeCOLineItem"("primeCoid");

-- CreateIndex
CREATE UNIQUE INDEX "PrimeCOLineItem_primeCoid_sequenceNumber_key" ON "PrimeCOLineItem"("primeCoid", "sequenceNumber");

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
CREATE INDEX "VendorQuotation_rfqId_idx" ON "VendorQuotation"("rfqId");

-- CreateIndex
CREATE INDEX "VendorQuotation_vendorId_idx" ON "VendorQuotation"("vendorId");

-- CreateIndex
CREATE INDEX "VendorQuotation_statusId_idx" ON "VendorQuotation"("statusId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorQuotation_rfqId_vendorId_key" ON "VendorQuotation"("rfqId", "vendorId");

-- CreateIndex
CREATE INDEX "QuoteLineItem_quoteId_idx" ON "QuoteLineItem"("quoteId");

-- CreateIndex
CREATE INDEX "QuoteLineItem_deliverableId_idx" ON "QuoteLineItem"("deliverableId");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteLineItem_quoteId_deliverableId_key" ON "QuoteLineItem"("quoteId", "deliverableId");

-- CreateIndex
CREATE UNIQUE INDEX "RFQAttachment_documentId_key" ON "RFQAttachment"("documentId");

-- CreateIndex
CREATE INDEX "RFQAttachment_rfqId_idx" ON "RFQAttachment"("rfqId");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteAttachment_documentId_key" ON "QuoteAttachment"("documentId");

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
CREATE INDEX "POStatusHistory_purchaseOrderId_idx" ON "POStatusHistory"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderLineItem_purchaseOrderId_idx" ON "PurchaseOrderLineItem"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderLineItem_costCodeId_idx" ON "PurchaseOrderLineItem"("costCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderLineItem_purchaseOrderId_lineNumber_key" ON "PurchaseOrderLineItem"("purchaseOrderId", "lineNumber");

-- CreateIndex
CREATE UNIQUE INDEX "POAttachment_documentId_key" ON "POAttachment"("documentId");

-- CreateIndex
CREATE INDEX "POAttachment_purchaseOrderId_idx" ON "POAttachment"("purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "SCOChangeType_name_key" ON "SCOChangeType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SCOChangeType_code_key" ON "SCOChangeType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SCOChangeType_order_key" ON "SCOChangeType"("order");

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
CREATE INDEX "SCOStatusHistory_scoId_idx" ON "SCOStatusHistory"("scoId");

-- CreateIndex
CREATE INDEX "PurchaseOrderCOLineItem_pcoId_idx" ON "PurchaseOrderCOLineItem"("pcoId");

-- CreateIndex
CREATE INDEX "PurchaseOrderCOLineItem_poLineItemId_idx" ON "PurchaseOrderCOLineItem"("poLineItemId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderCOLineItem_pcoId_lineNumber_key" ON "PurchaseOrderCOLineItem"("pcoId", "lineNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SCOAttachment_documentId_key" ON "SCOAttachment"("documentId");

-- CreateIndex
CREATE INDEX "SCOAttachment_scoId_idx" ON "SCOAttachment"("scoId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceStatus_name_key" ON "InvoiceStatus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceStatus_order_key" ON "InvoiceStatus"("order");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceDocumentId_key" ON "Invoice"("invoiceDocumentId");

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
CREATE INDEX "InvoiceLineItem_invoiceId_idx" ON "InvoiceLineItem"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceLineItem_poLineItemId_idx" ON "InvoiceLineItem"("poLineItemId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceAttachment_documentId_key" ON "InvoiceAttachment"("documentId");

-- CreateIndex
CREATE INDEX "InvoiceAttachment_invoiceId_idx" ON "InvoiceAttachment"("invoiceId");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizationRole" ADD CONSTRAINT "organizationRole_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneralContractor" ADD CONSTRAINT "GeneralContractor_gcTypeId_fkey" FOREIGN KEY ("gcTypeId") REFERENCES "GCType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_professionalRoleId_fkey" FOREIGN KEY ("professionalRoleId") REFERENCES "ProfessionalRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactVendor" ADD CONSTRAINT "ContactVendor_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactVendor" ADD CONSTRAINT "ContactVendor_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactGC" ADD CONSTRAINT "ContactGC_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactGC" ADD CONSTRAINT "ContactGC_generalContractorId_fkey" FOREIGN KEY ("generalContractorId") REFERENCES "GeneralContractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostCode" ADD CONSTRAINT "CostCode_costCodeCategoryId_fkey" FOREIGN KEY ("costCodeCategoryId") REFERENCES "CostCodeCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "ProjectStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ProjectStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_gcId_fkey" FOREIGN KEY ("gcId") REFERENCES "GeneralContractor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_leadPMId_fkey" FOREIGN KEY ("leadPMId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrimeContract" ADD CONSTRAINT "PrimeContract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrimeContract" ADD CONSTRAINT "PrimeContract_executedContractDocId_fkey" FOREIGN KEY ("executedContractDocId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrimeContractAttachment" ADD CONSTRAINT "PrimeContractAttachment_primeContractId_fkey" FOREIGN KEY ("primeContractId") REFERENCES "PrimeContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrimeContractAttachment" ADD CONSTRAINT "PrimeContractAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTeamAssignment" ADD CONSTRAINT "ProjectTeamAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTeamAssignment" ADD CONSTRAINT "ProjectTeamAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectScheduleEntry" ADD CONSTRAINT "ProjectScheduleEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectScheduleEntry" ADD CONSTRAINT "ProjectScheduleEntry_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectScheduleEntry" ADD CONSTRAINT "ProjectScheduleEntry_changeOrderId_fkey" FOREIGN KEY ("changeOrderId") REFERENCES "PrimeChangeOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrimeChangeOrder" ADD CONSTRAINT "PrimeChangeOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrimeChangeOrder" ADD CONSTRAINT "PrimeChangeOrder_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ChangeOrderStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrimeChangeOrder" ADD CONSTRAINT "PrimeChangeOrder_changeTypeId_fkey" FOREIGN KEY ("changeTypeId") REFERENCES "PCOChangeType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrimeChangeOrder" ADD CONSTRAINT "PrimeChangeOrder_costCodeId_fkey" FOREIGN KEY ("costCodeId") REFERENCES "CostCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrimeChangeOrder" ADD CONSTRAINT "PrimeChangeOrder_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrimeChangeOrder" ADD CONSTRAINT "PrimeChangeOrder_supersededBy_fkey" FOREIGN KEY ("supersededBy") REFERENCES "PrimeChangeOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PCOStatusHistory" ADD CONSTRAINT "PCOStatusHistory_pcoId_fkey" FOREIGN KEY ("pcoId") REFERENCES "PrimeChangeOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PCOStatusHistory" ADD CONSTRAINT "PCOStatusHistory_fromStatusId_fkey" FOREIGN KEY ("fromStatusId") REFERENCES "ChangeOrderStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PCOStatusHistory" ADD CONSTRAINT "PCOStatusHistory_toStatusId_fkey" FOREIGN KEY ("toStatusId") REFERENCES "ChangeOrderStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PCOAttachment" ADD CONSTRAINT "PCOAttachment_pcoId_fkey" FOREIGN KEY ("pcoId") REFERENCES "PrimeChangeOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PCOAttachment" ADD CONSTRAINT "PCOAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrimeCOLineItem" ADD CONSTRAINT "PrimeCOLineItem_primeCoid_fkey" FOREIGN KEY ("primeCoid") REFERENCES "PrimeChangeOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQ" ADD CONSTRAINT "RFQ_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQ" ADD CONSTRAINT "RFQ_costCodeId_fkey" FOREIGN KEY ("costCodeId") REFERENCES "CostCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQ" ADD CONSTRAINT "RFQ_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "RFQStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQ" ADD CONSTRAINT "RFQ_awardedVendorId_fkey" FOREIGN KEY ("awardedVendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQ" ADD CONSTRAINT "RFQ_generatedPOId_fkey" FOREIGN KEY ("generatedPOId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQDeliverable" ADD CONSTRAINT "RFQDeliverable_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RFQ"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQVendorInvite" ADD CONSTRAINT "RFQVendorInvite_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RFQ"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQVendorInvite" ADD CONSTRAINT "RFQVendorInvite_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorQuotation" ADD CONSTRAINT "VendorQuotation_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RFQ"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorQuotation" ADD CONSTRAINT "VendorQuotation_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RFQ"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "PurchaseOrderLineItem" ADD CONSTRAINT "PurchaseOrderLineItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLineItem" ADD CONSTRAINT "PurchaseOrderLineItem_rfqDeliverableId_fkey" FOREIGN KEY ("rfqDeliverableId") REFERENCES "RFQDeliverable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POAttachment" ADD CONSTRAINT "POAttachment_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POAttachment" ADD CONSTRAINT "POAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderCO" ADD CONSTRAINT "PurchaseOrderCO_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "PurchaseOrderCOLineItem" ADD CONSTRAINT "PurchaseOrderCOLineItem_pcoId_fkey" FOREIGN KEY ("pcoId") REFERENCES "PurchaseOrderCO"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderCOLineItem" ADD CONSTRAINT "PurchaseOrderCOLineItem_poLineItemId_fkey" FOREIGN KEY ("poLineItemId") REFERENCES "PurchaseOrderLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCOAttachment" ADD CONSTRAINT "SCOAttachment_scoId_fkey" FOREIGN KEY ("scoId") REFERENCES "PurchaseOrderCO"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SCOAttachment" ADD CONSTRAINT "SCOAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "InvoiceStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_invoiceDocumentId_fkey" FOREIGN KEY ("invoiceDocumentId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_poLineItemId_fkey" FOREIGN KEY ("poLineItemId") REFERENCES "PurchaseOrderLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceAttachment" ADD CONSTRAINT "InvoiceAttachment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceAttachment" ADD CONSTRAINT "InvoiceAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
