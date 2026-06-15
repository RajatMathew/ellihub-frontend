/*
  Warnings:

  - You are about to drop the `DepartmentEmployee` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DepartmentEmployee" DROP CONSTRAINT "DepartmentEmployee_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "DepartmentEmployee" DROP CONSTRAINT "DepartmentEmployee_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "DepartmentEmployee" DROP CONSTRAINT "DepartmentEmployee_roleId_fkey";

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "roleId" TEXT;

-- DropTable
DROP TABLE "DepartmentEmployee";

-- CreateIndex
CREATE INDEX "Employee_departmentId_idx" ON "Employee"("departmentId");

-- CreateIndex
CREATE INDEX "Employee_roleId_idx" ON "Employee"("roleId");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Lookup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
