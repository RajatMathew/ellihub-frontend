-- CreateTable
CREATE TABLE "PrimePayments" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "transactionDetail" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "projectId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrimePayments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PrimePayments" ADD CONSTRAINT "PrimePayments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
