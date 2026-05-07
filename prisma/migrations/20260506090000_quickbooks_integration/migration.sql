-- CreateEnum
CREATE TYPE "QuickBooksEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "QuickBooksConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED');

-- CreateTable
CREATE TABLE "QuickBooksConnection" (
    "id" TEXT NOT NULL,
    "realmId" TEXT NOT NULL,
    "companyName" TEXT,
    "environment" "QuickBooksEnvironment" NOT NULL DEFAULT 'SANDBOX',
    "status" "QuickBooksConnectionStatus" NOT NULL DEFAULT 'CONNECTED',
    "scope" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL DEFAULT 'bearer',
    "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "connectedById" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuickBooksConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuickBooksOAuthState" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "redirectTo" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuickBooksOAuthState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuickBooksConnection_realmId_key" ON "QuickBooksConnection"("realmId");

-- CreateIndex
CREATE INDEX "QuickBooksConnection_status_idx" ON "QuickBooksConnection"("status");

-- CreateIndex
CREATE INDEX "QuickBooksConnection_connectedById_idx" ON "QuickBooksConnection"("connectedById");

-- CreateIndex
CREATE UNIQUE INDEX "QuickBooksOAuthState_state_key" ON "QuickBooksOAuthState"("state");

-- CreateIndex
CREATE INDEX "QuickBooksOAuthState_userId_idx" ON "QuickBooksOAuthState"("userId");

-- CreateIndex
CREATE INDEX "QuickBooksOAuthState_expiresAt_idx" ON "QuickBooksOAuthState"("expiresAt");

-- AddForeignKey
ALTER TABLE "QuickBooksConnection" ADD CONSTRAINT "QuickBooksConnection_connectedById_fkey" FOREIGN KEY ("connectedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuickBooksOAuthState" ADD CONSTRAINT "QuickBooksOAuthState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "PurchaseOrderQuickBooksPayment" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "realmId" TEXT NOT NULL,
    "quickBooksEntity" TEXT NOT NULL,
    "quickBooksTransactionId" TEXT NOT NULL,
    "docNumber" TEXT,
    "displayName" TEXT NOT NULL,
    "txnDate" TIMESTAMP(3),
    "totalAmount" DECIMAL(15,2),
    "currency" TEXT,
    "privateNote" TEXT,
    "lastUpdatedTime" TIMESTAMP(3),
    "raw" JSONB NOT NULL,
    "linkedById" TEXT,
    "removedAt" TIMESTAMP(3),
    "removedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderQuickBooksPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseOrderQuickBooksPayment_purchaseOrderId_idx" ON "PurchaseOrderQuickBooksPayment"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderQuickBooksPayment_realmId_quickBooksEntity_qui_idx"
ON "PurchaseOrderQuickBooksPayment"("realmId", "quickBooksEntity", "quickBooksTransactionId");

-- CreateIndex
CREATE INDEX "PurchaseOrderQuickBooksPayment_linkedById_idx" ON "PurchaseOrderQuickBooksPayment"("linkedById");

-- CreateIndex
CREATE INDEX "PurchaseOrderQuickBooksPayment_removedById_idx" ON "PurchaseOrderQuickBooksPayment"("removedById");

-- CreateIndex
CREATE INDEX "PurchaseOrderQuickBooksPayment_removedAt_idx" ON "PurchaseOrderQuickBooksPayment"("removedAt");

-- One active PO link per QuickBooks transaction. Removed links remain as audit history.
CREATE UNIQUE INDEX "PurchaseOrderQuickBooksPayment_active_transaction_key"
ON "PurchaseOrderQuickBooksPayment"("realmId", "quickBooksEntity", "quickBooksTransactionId")
WHERE "removedAt" IS NULL;

-- AddForeignKey
ALTER TABLE "PurchaseOrderQuickBooksPayment" ADD CONSTRAINT "PurchaseOrderQuickBooksPayment_purchaseOrderId_fkey"
FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderQuickBooksPayment" ADD CONSTRAINT "PurchaseOrderQuickBooksPayment_linkedById_fkey"
FOREIGN KEY ("linkedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderQuickBooksPayment" ADD CONSTRAINT "PurchaseOrderQuickBooksPayment_removedById_fkey"
FOREIGN KEY ("removedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
