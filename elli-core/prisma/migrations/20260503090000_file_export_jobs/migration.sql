CREATE TYPE "FileExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED');

CREATE TABLE "FileExportJob" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "status" "FileExportStatus" NOT NULL DEFAULT 'PENDING',
    "fileName" TEXT NOT NULL,
    "objectId" TEXT,
    "totalFiles" INTEGER NOT NULL DEFAULT 0,
    "processedFiles" INTEGER NOT NULL DEFAULT 0,
    "totalBytes" TEXT NOT NULL DEFAULT '0',
    "processedBytes" TEXT NOT NULL DEFAULT '0',
    "error" TEXT,
    "createdBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileExportJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FileExportJob_folderId_idx" ON "FileExportJob"("folderId");
CREATE INDEX "FileExportJob_createdBy_idx" ON "FileExportJob"("createdBy");
CREATE INDEX "FileExportJob_status_idx" ON "FileExportJob"("status");
CREATE INDEX "FileExportJob_expiresAt_idx" ON "FileExportJob"("expiresAt");

ALTER TABLE "FileExportJob"
    ADD CONSTRAINT "FileExportJob_folderId_fkey"
    FOREIGN KEY ("folderId") REFERENCES "File"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
