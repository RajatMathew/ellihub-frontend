-- AlterTable: Make description required with default
ALTER TABLE "CostCode" ALTER COLUMN "description" SET DEFAULT '';
ALTER TABLE "CostCode" ALTER COLUMN "description" SET NOT NULL;

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

-- CreateIndex (unique constraint)
CREATE UNIQUE INDEX "CostCode_code_tenantId_key" ON "CostCode"("code", "tenantId");
