/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `CostCode` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `CostCode` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `CostCodeCategory` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "CostCode_code_idx";

-- CreateIndex
CREATE UNIQUE INDEX "CostCode_name_key" ON "CostCode"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CostCode_code_key" ON "CostCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CostCodeCategory_name_key" ON "CostCodeCategory"("name");
