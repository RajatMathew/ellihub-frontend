-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "budgetPercentage" SET DEFAULT 0;

-- AddForeignKey
ALTER TABLE "ProjectTeamAssignment" ADD CONSTRAINT "ProjectTeamAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTeamAssignment" ADD CONSTRAINT "ProjectTeamAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
