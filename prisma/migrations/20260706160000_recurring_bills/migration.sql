-- CreateEnum
CREATE TYPE "RecurringBillFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM_MONTHLY');

-- CreateEnum
CREATE TYPE "RecurringBillScheduleTiming" AS ENUM ('START_OF_MONTH', 'DAY_OF_MONTH', 'END_OF_MONTH', 'DAY_OF_WEEK', 'ANCHOR_DATE');

-- CreateEnum
CREATE TYPE "RecurringBillAmountMode" AS ENUM ('FIXED', 'VARIABLE');

-- CreateEnum
CREATE TYPE "RecurringBillOccurrenceStatus" AS ENUM ('DUE', 'PAID', 'SKIPPED', 'CANCELLED', 'FAILED');

-- CreateTable
CREATE TABLE "RecurringBillRule" (
    "id" TEXT NOT NULL,
    "realmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qbVendorId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "bankAccountId" TEXT,
    "bankAccountName" TEXT,
    "categoryId" TEXT,
    "categoryName" TEXT,
    "frequency" "RecurringBillFrequency" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "anchorDate" DATE NOT NULL,
    "scheduleTiming" "RecurringBillScheduleTiming" NOT NULL,
    "dayOfMonth" INTEGER,
    "dayOfWeek" INTEGER,
    "amountMode" "RecurringBillAmountMode" NOT NULL,
    "defaultAmount" DECIMAL(15,2),
    "descriptionTemplate" TEXT,
    "memoTemplate" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsOn" DATE,
    "endsOn" DATE,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringBillRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringBillOccurrence" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "cycleKey" TEXT NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" "RecurringBillOccurrenceStatus" NOT NULL DEFAULT 'DUE',
    "plannedAmount" DECIMAL(15,2),
    "skippedAt" TIMESTAMP(3),
    "skippedById" TEXT,
    "skipReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringBillOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringBillPayment" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "occurrenceId" TEXT,
    "cycleKey" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "txnDate" DATE NOT NULL,
    "qbVendorId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "transactionUrl" TEXT NOT NULL,
    "quickBooksResponse" JSONB,
    "printLater" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL,
    "memo" TEXT,
    "invoiceDocumentId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringBillPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringBillRule_realmId_deletedAt_idx" ON "RecurringBillRule"("realmId", "deletedAt");

-- CreateIndex
CREATE INDEX "RecurringBillRule_realmId_isActive_idx" ON "RecurringBillRule"("realmId", "isActive");

-- CreateIndex
CREATE INDEX "RecurringBillRule_qbVendorId_idx" ON "RecurringBillRule"("qbVendorId");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringBillOccurrence_ruleId_cycleKey_key" ON "RecurringBillOccurrence"("ruleId", "cycleKey");

-- CreateIndex
CREATE INDEX "RecurringBillOccurrence_ruleId_idx" ON "RecurringBillOccurrence"("ruleId");

-- CreateIndex
CREATE INDEX "RecurringBillOccurrence_dueDate_idx" ON "RecurringBillOccurrence"("dueDate");

-- CreateIndex
CREATE INDEX "RecurringBillOccurrence_status_idx" ON "RecurringBillOccurrence"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringBillPayment_occurrenceId_key" ON "RecurringBillPayment"("occurrenceId");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringBillPayment_ruleId_cycleKey_key" ON "RecurringBillPayment"("ruleId", "cycleKey");

-- CreateIndex
CREATE INDEX "RecurringBillPayment_ruleId_idx" ON "RecurringBillPayment"("ruleId");

-- CreateIndex
CREATE INDEX "RecurringBillPayment_txnDate_idx" ON "RecurringBillPayment"("txnDate");

-- CreateIndex
CREATE INDEX "RecurringBillPayment_invoiceDocumentId_idx" ON "RecurringBillPayment"("invoiceDocumentId");

-- AddForeignKey
ALTER TABLE "RecurringBillOccurrence" ADD CONSTRAINT "RecurringBillOccurrence_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "RecurringBillRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringBillPayment" ADD CONSTRAINT "RecurringBillPayment_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "RecurringBillRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringBillPayment" ADD CONSTRAINT "RecurringBillPayment_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "RecurringBillOccurrence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
