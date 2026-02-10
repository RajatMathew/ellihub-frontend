-- CreateEnum
CREATE TYPE "FilePermssion" AS ENUM ('DELETE', 'READ', 'DOWNLOAD', 'CHANGE_PERMISSION');

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "deletedBy" TEXT;

-- CreateTable
CREATE TABLE "FileAccess" (
    "fileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissions" "FilePermssion"[],

    CONSTRAINT "FileAccess_pkey" PRIMARY KEY ("fileId","userId")
);
