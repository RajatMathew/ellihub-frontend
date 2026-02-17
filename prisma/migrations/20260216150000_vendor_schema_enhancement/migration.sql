-- CreateEnum
CREATE TYPE "PaymentTerms" AS ENUM ('NET_15', 'NET_30', 'NET_45', 'NET_60', 'NET_90', 'DUE_ON_RECEIPT');

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "categoryTags" TEXT[],
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paymentTerms" "PaymentTerms" NOT NULL DEFAULT 'NET_30',
ADD COLUMN     "website" TEXT,
ALTER COLUMN "taxId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Vendor_name_idx" ON "Vendor"("name");

-- CreateIndex
CREATE INDEX "Vendor_status_idx" ON "Vendor"("status");

-- CreateIndex
CREATE INDEX "Vendor_type_idx" ON "Vendor"("type");
