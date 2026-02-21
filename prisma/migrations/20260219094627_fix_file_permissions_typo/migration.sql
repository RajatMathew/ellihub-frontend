/*
  Warnings:

  - The `permissions` column on the `FileAccess` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "FilePermission" AS ENUM ('DELETE', 'READ', 'DOWNLOAD', 'CHANGE_PERMISSION', 'ACCESS', 'CREATE_FILE_WITHIN');

-- AlterTable
ALTER TABLE "FileAccess" DROP COLUMN "permissions",
ADD COLUMN     "permissions" "FilePermission"[];

-- DropEnum
DROP TYPE "FilePermssion";
