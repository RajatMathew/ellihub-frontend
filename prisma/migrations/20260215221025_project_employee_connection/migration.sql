-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_leadPMId_fkey";

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_leadPMId_fkey" FOREIGN KEY ("leadPMId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
