/*
  Warnings:

  - The values [SUBMITALLS] on the enum `ProjectStage` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ProjectStage_new" AS ENUM ('INSTALLATION', 'FABRICATION', 'SUBMITTALS', 'BUYOUT', 'CLOSEOUT', 'PUNCHLIST');
ALTER TABLE "Project" ALTER COLUMN "stage" TYPE "ProjectStage_new" USING ("stage"::text::"ProjectStage_new");
ALTER TYPE "ProjectStage" RENAME TO "ProjectStage_old";
ALTER TYPE "ProjectStage_new" RENAME TO "ProjectStage";
DROP TYPE "public"."ProjectStage_old";
COMMIT;
