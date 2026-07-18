-- CreateEnum
CREATE TYPE "EmailServiceType" AS ENUM ('GOOGLE', 'OFFICE365');

-- CreateEnum
CREATE TYPE "EmailAccountStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "EmailSyncStatus" AS ENUM ('IDLE', 'SYNCING', 'READY', 'ERROR');

-- CreateEnum
CREATE TYPE "EmailFolderWellKnown" AS ENUM ('INBOX', 'DRAFTS', 'SENT', 'DELETED', 'JUNK', 'ARCHIVE');

-- CreateTable
CREATE TABLE "EmailAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "aurinkoAccountId" TEXT NOT NULL,
    "aurinkoUserId" TEXT,
    "serviceType" "EmailServiceType" NOT NULL,
    "status" "EmailAccountStatus" NOT NULL DEFAULT 'CONNECTED',
    "email" TEXT NOT NULL,
    "mailboxAddress" TEXT,
    "displayName" TEXT,
    "scope" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL DEFAULT 'bearer',
    "connectedById" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailOAuthState" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceType" "EmailServiceType" NOT NULL,
    "redirectTo" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailOAuthState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSyncState" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "syncUpdatedToken" TEXT,
    "syncDeletedToken" TEXT,
    "lastSyncStatus" "EmailSyncStatus",
    "lastSyncError" TEXT,
    "lastStartedAt" TIMESTAMP(3),
    "lastCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailFolderCache" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT,
    "parentId" TEXT,
    "sysLabel" TEXT,
    "wellKnownKey" "EmailFolderWellKnown",
    "isFolder" BOOLEAN NOT NULL DEFAULT true,
    "isLabel" BOOLEAN NOT NULL DEFAULT false,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "raw" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailFolderCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailMessageCache" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "threadId" TEXT,
    "folderId" TEXT,
    "internetMessageId" TEXT,
    "subject" TEXT,
    "preview" TEXT,
    "bodyHtml" TEXT,
    "bodyText" TEXT,
    "fromName" TEXT,
    "fromEmail" TEXT,
    "to" JSONB NOT NULL,
    "cc" JSONB NOT NULL,
    "bcc" JSONB NOT NULL,
    "replyTo" JSONB NOT NULL,
    "sentAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "providerCreatedAt" TIMESTAMP(3),
    "providerUpdatedAt" TIMESTAMP(3),
    "unread" BOOLEAN NOT NULL DEFAULT false,
    "hasAttachments" BOOLEAN NOT NULL DEFAULT false,
    "attachmentCount" INTEGER NOT NULL DEFAULT 0,
    "sysLabels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "webLink" TEXT,
    "raw" JSONB,
    "deletedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailMessageCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailAttachmentCache" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "inline" BOOLEAN NOT NULL DEFAULT false,
    "contentId" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailAttachmentCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailWebhookSubscription" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "aurinkoSubscriptionId" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "notificationUrl" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "failSince" TIMESTAMP(3),
    "failDescription" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailWebhookSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailAccount_aurinkoAccountId_key" ON "EmailAccount"("aurinkoAccountId");
CREATE INDEX "EmailAccount_organizationId_idx" ON "EmailAccount"("organizationId");
CREATE INDEX "EmailAccount_status_idx" ON "EmailAccount"("status");
CREATE INDEX "EmailAccount_email_idx" ON "EmailAccount"("email");
CREATE INDEX "EmailAccount_connectedById_idx" ON "EmailAccount"("connectedById");

CREATE UNIQUE INDEX "EmailOAuthState_state_key" ON "EmailOAuthState"("state");
CREATE INDEX "EmailOAuthState_organizationId_idx" ON "EmailOAuthState"("organizationId");
CREATE INDEX "EmailOAuthState_userId_idx" ON "EmailOAuthState"("userId");
CREATE INDEX "EmailOAuthState_expiresAt_idx" ON "EmailOAuthState"("expiresAt");

CREATE UNIQUE INDEX "EmailSyncState_accountId_key" ON "EmailSyncState"("accountId");
CREATE INDEX "EmailSyncState_lastSyncStatus_idx" ON "EmailSyncState"("lastSyncStatus");

CREATE UNIQUE INDEX "EmailFolderCache_accountId_providerId_key" ON "EmailFolderCache"("accountId", "providerId");
CREATE INDEX "EmailFolderCache_accountId_idx" ON "EmailFolderCache"("accountId");
CREATE INDEX "EmailFolderCache_wellKnownKey_idx" ON "EmailFolderCache"("wellKnownKey");
CREATE INDEX "EmailFolderCache_parentId_idx" ON "EmailFolderCache"("parentId");

CREATE UNIQUE INDEX "EmailMessageCache_accountId_providerId_key" ON "EmailMessageCache"("accountId", "providerId");
CREATE INDEX "EmailMessageCache_accountId_receivedAt_idx" ON "EmailMessageCache"("accountId", "receivedAt" DESC);
CREATE INDEX "EmailMessageCache_accountId_folderId_receivedAt_idx" ON "EmailMessageCache"("accountId", "folderId", "receivedAt" DESC);
CREATE INDEX "EmailMessageCache_accountId_threadId_idx" ON "EmailMessageCache"("accountId", "threadId");
CREATE INDEX "EmailMessageCache_deletedAt_idx" ON "EmailMessageCache"("deletedAt");

CREATE UNIQUE INDEX "EmailAttachmentCache_messageId_providerId_key" ON "EmailAttachmentCache"("messageId", "providerId");
CREATE INDEX "EmailAttachmentCache_messageId_idx" ON "EmailAttachmentCache"("messageId");

CREATE UNIQUE INDEX "EmailWebhookSubscription_aurinkoSubscriptionId_key" ON "EmailWebhookSubscription"("aurinkoSubscriptionId");
CREATE INDEX "EmailWebhookSubscription_accountId_idx" ON "EmailWebhookSubscription"("accountId");
CREATE INDEX "EmailWebhookSubscription_active_idx" ON "EmailWebhookSubscription"("active");

-- AddForeignKey
ALTER TABLE "EmailAccount" ADD CONSTRAINT "EmailAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailAccount" ADD CONSTRAINT "EmailAccount_connectedById_fkey" FOREIGN KEY ("connectedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailOAuthState" ADD CONSTRAINT "EmailOAuthState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailSyncState" ADD CONSTRAINT "EmailSyncState_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "EmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailFolderCache" ADD CONSTRAINT "EmailFolderCache_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "EmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailMessageCache" ADD CONSTRAINT "EmailMessageCache_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "EmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailMessageCache" ADD CONSTRAINT "EmailMessageCache_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "EmailFolderCache"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailAttachmentCache" ADD CONSTRAINT "EmailAttachmentCache_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "EmailMessageCache"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailWebhookSubscription" ADD CONSTRAINT "EmailWebhookSubscription_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "EmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
