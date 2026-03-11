/*
  Warnings:

  - You are about to drop the column `fromStatus` on the `PCOStatusHistory` table. All the data in the column will be lost.
  - You are about to drop the column `toStatus` on the `PCOStatusHistory` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `PrimeChangeOrder` table. All the data in the column will be lost.
  - Added the required column `toStatusId` to the `PCOStatusHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `statusId` to the `PrimeChangeOrder` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "PrimeChangeOrder_projectId_status_date_idx";

-- AlterTable
ALTER TABLE "PCOStatusHistory" DROP COLUMN "fromStatus",
DROP COLUMN "toStatus",
ADD COLUMN     "fromStatusId" TEXT,
ADD COLUMN     "toStatusId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PrimeChangeOrder" DROP COLUMN "status",
ADD COLUMN     "statusId" TEXT NOT NULL;

-- DropEnum
DROP TYPE "ChangeOrderStatus";

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

-- CreateIndex
CREATE UNIQUE INDEX "ChangeOrderStatus_name_key" ON "ChangeOrderStatus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ChangeOrderStatus_order_key" ON "ChangeOrderStatus"("order");

-- CreateIndex
CREATE INDEX "PrimeChangeOrder_projectId_statusId_date_idx" ON "PrimeChangeOrder"("projectId", "statusId", "date");

-- AddForeignKey
ALTER TABLE "PrimeChangeOrder" ADD CONSTRAINT "PrimeChangeOrder_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ChangeOrderStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PCOStatusHistory" ADD CONSTRAINT "PCOStatusHistory_fromStatusId_fkey" FOREIGN KEY ("fromStatusId") REFERENCES "ChangeOrderStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PCOStatusHistory" ADD CONSTRAINT "PCOStatusHistory_toStatusId_fkey" FOREIGN KEY ("toStatusId") REFERENCES "ChangeOrderStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
