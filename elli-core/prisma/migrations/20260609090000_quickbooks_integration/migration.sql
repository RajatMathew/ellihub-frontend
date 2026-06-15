-- QuickBooks connection, OAuth state, and reference-data sync.

-- CreateEnum
CREATE TYPE "QuickBooksEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "QuickBooksConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "QuickBooksReferenceEntity" AS ENUM ('BANK_ACCOUNT', 'LINE_ITEM_CATEGORY', 'PAYEE');

-- CreateEnum
CREATE TYPE "QuickBooksReferenceSyncStatus" AS ENUM ('SUCCESS', 'FAILED', 'PARTIAL');

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
    "referenceAutoSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
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

-- CreateTable
CREATE TABLE "QuickBooksReferenceSyncState" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "realmId" TEXT NOT NULL,
    "entity" "QuickBooksReferenceEntity" NOT NULL,
    "lastFullSyncedAt" TIMESTAMP(3),
    "lastCdcSyncedAt" TIMESTAMP(3),
    "cdcWatermark" TIMESTAMP(3),
    "lastSyncStatus" "QuickBooksReferenceSyncStatus",
    "lastSyncError" TEXT,
    "totalReceived" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "deletedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuickBooksReferenceSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuickBooksReferenceSyncLock" (
    "realmId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuickBooksReferenceSyncLock_pkey" PRIMARY KEY ("realmId")
);

-- CreateTable
CREATE TABLE "QuickBooksBankAccount" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "realmId" TEXT NOT NULL,
    "quickBooksId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullyQualifiedName" TEXT,
    "classification" TEXT,
    "accountType" TEXT,
    "accountSubType" TEXT,
    "currentBalance" DECIMAL(15, 2),
    "currentBalanceWithSubAccounts" DECIMAL(15, 2),
    "currencyCode" TEXT,
    "active" BOOLEAN,
    "syncToken" TEXT,
    "quickBooksCreatedAt" TIMESTAMP(3),
    "quickBooksUpdatedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "raw" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuickBooksBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuickBooksLineItemCategory" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "realmId" TEXT NOT NULL,
    "quickBooksId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullyQualifiedName" TEXT,
    "classification" TEXT,
    "accountType" TEXT,
    "accountSubType" TEXT,
    "currentBalance" DECIMAL(15, 2),
    "currentBalanceWithSubAccounts" DECIMAL(15, 2),
    "currencyCode" TEXT,
    "description" TEXT,
    "active" BOOLEAN,
    "syncToken" TEXT,
    "quickBooksCreatedAt" TIMESTAMP(3),
    "quickBooksUpdatedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "raw" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuickBooksLineItemCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuickBooksPayee" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "realmId" TEXT NOT NULL,
    "quickBooksId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "companyName" TEXT,
    "givenName" TEXT,
    "familyName" TEXT,
    "primaryEmail" TEXT,
    "primaryPhone" TEXT,
    "active" BOOLEAN,
    "syncToken" TEXT,
    "quickBooksUpdatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "raw" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuickBooksPayee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuickBooksConnection_realmId_key" ON "QuickBooksConnection"("realmId");
CREATE INDEX "QuickBooksConnection_status_idx" ON "QuickBooksConnection"("status");
CREATE INDEX "QuickBooksConnection_connectedById_idx" ON "QuickBooksConnection"("connectedById");
CREATE UNIQUE INDEX "QuickBooksOAuthState_state_key" ON "QuickBooksOAuthState"("state");
CREATE INDEX "QuickBooksOAuthState_userId_idx" ON "QuickBooksOAuthState"("userId");
CREATE INDEX "QuickBooksOAuthState_expiresAt_idx" ON "QuickBooksOAuthState"("expiresAt");
CREATE UNIQUE INDEX "QuickBooksReferenceSyncState_realmId_entity_key" ON "QuickBooksReferenceSyncState"("realmId", "entity");
CREATE INDEX "QuickBooksReferenceSyncState_connectionId_idx" ON "QuickBooksReferenceSyncState"("connectionId");
CREATE INDEX "QuickBooksReferenceSyncState_entity_idx" ON "QuickBooksReferenceSyncState"("entity");
CREATE INDEX "QuickBooksReferenceSyncState_lastSyncStatus_idx" ON "QuickBooksReferenceSyncState"("lastSyncStatus");
CREATE INDEX "QuickBooksReferenceSyncLock_connectionId_idx" ON "QuickBooksReferenceSyncLock"("connectionId");
CREATE INDEX "QuickBooksReferenceSyncLock_expiresAt_idx" ON "QuickBooksReferenceSyncLock"("expiresAt");
CREATE INDEX "QuickBooksReferenceSyncLock_ownerId_idx" ON "QuickBooksReferenceSyncLock"("ownerId");
CREATE UNIQUE INDEX "QuickBooksBankAccount_realmId_quickBooksId_key" ON "QuickBooksBankAccount"("realmId", "quickBooksId");
CREATE INDEX "QuickBooksBankAccount_connectionId_idx" ON "QuickBooksBankAccount"("connectionId");
CREATE INDEX "QuickBooksBankAccount_deletedAt_idx" ON "QuickBooksBankAccount"("deletedAt");
CREATE UNIQUE INDEX "QuickBooksLineItemCategory_realmId_quickBooksId_key" ON "QuickBooksLineItemCategory"("realmId", "quickBooksId");
CREATE INDEX "QuickBooksLineItemCategory_connectionId_idx" ON "QuickBooksLineItemCategory"("connectionId");
CREATE INDEX "QuickBooksLineItemCategory_deletedAt_idx" ON "QuickBooksLineItemCategory"("deletedAt");
CREATE UNIQUE INDEX "QuickBooksPayee_realmId_quickBooksId_key" ON "QuickBooksPayee"("realmId", "quickBooksId");
CREATE INDEX "QuickBooksPayee_connectionId_idx" ON "QuickBooksPayee"("connectionId");
CREATE INDEX "QuickBooksPayee_deletedAt_idx" ON "QuickBooksPayee"("deletedAt");

-- AddForeignKey
ALTER TABLE "QuickBooksConnection" ADD CONSTRAINT "QuickBooksConnection_connectedById_fkey" FOREIGN KEY ("connectedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuickBooksOAuthState" ADD CONSTRAINT "QuickBooksOAuthState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuickBooksReferenceSyncState" ADD CONSTRAINT "QuickBooksReferenceSyncState_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "QuickBooksConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuickBooksReferenceSyncLock" ADD CONSTRAINT "QuickBooksReferenceSyncLock_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "QuickBooksConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuickBooksBankAccount" ADD CONSTRAINT "QuickBooksBankAccount_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "QuickBooksConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuickBooksLineItemCategory" ADD CONSTRAINT "QuickBooksLineItemCategory_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "QuickBooksConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuickBooksPayee" ADD CONSTRAINT "QuickBooksPayee_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "QuickBooksConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
