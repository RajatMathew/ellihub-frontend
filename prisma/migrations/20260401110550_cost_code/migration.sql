-- CreateTable
CREATE TABLE "CostCodeCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
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
    "description" TEXT NOT NULL DEFAULT '',
    "costCodeCategoryId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CostCodeCategory_deletedAt_idx" ON "CostCodeCategory"("deletedAt");

-- CreateIndex
CREATE INDEX "CostCode_code_idx" ON "CostCode"("code");

-- CreateIndex
CREATE INDEX "CostCode_deletedAt_idx" ON "CostCode"("deletedAt");

-- AddForeignKey
ALTER TABLE "CostCode" ADD CONSTRAINT "CostCode_costCodeCategoryId_fkey" FOREIGN KEY ("costCodeCategoryId") REFERENCES "CostCodeCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
