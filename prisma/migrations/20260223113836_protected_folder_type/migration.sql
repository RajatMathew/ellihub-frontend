-- CreateEnum
CREATE TYPE "ProtectedFolderType" AS ENUM ('PROJECT_ROOT', 'INVOICE', 'RFQ', 'PURCHASE_ORDER', 'PURCHASE_ORDER_CO', 'PRIME_CO', 'PRIME_CONTRACT');

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "protectedFolderType" "ProtectedFolderType";
