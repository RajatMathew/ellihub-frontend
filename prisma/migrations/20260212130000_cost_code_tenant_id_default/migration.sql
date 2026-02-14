-- AlterTable: Set default value for tenantId on CostCodeCategory
ALTER TABLE "CostCodeCategory" ALTER COLUMN "tenantId" SET DEFAULT 'default';

-- AlterTable: Set default value for tenantId on CostCode
ALTER TABLE "CostCode" ALTER COLUMN "tenantId" SET DEFAULT 'default';
