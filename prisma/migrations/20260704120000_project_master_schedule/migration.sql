-- Add Master Schedule as a protected project file area.
ALTER TYPE "ProtectedFolderType" ADD VALUE IF NOT EXISTS 'MASTER_SCHEDULE';

CREATE TABLE "ProjectMasterSchedule" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "displayName" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "objectId" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMasterSchedule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectMasterSchedule_projectId_idx" ON "ProjectMasterSchedule"("projectId");
CREATE INDEX "ProjectMasterSchedule_fileId_idx" ON "ProjectMasterSchedule"("fileId");
CREATE INDEX "ProjectMasterSchedule_deletedAt_idx" ON "ProjectMasterSchedule"("deletedAt");
CREATE UNIQUE INDEX "ProjectMasterSchedule_projectId_active_key"
    ON "ProjectMasterSchedule"("projectId")
    WHERE "deletedAt" IS NULL;

ALTER TABLE "ProjectMasterSchedule"
    ADD CONSTRAINT "ProjectMasterSchedule_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProjectMasterSchedule"
    ADD CONSTRAINT "ProjectMasterSchedule_fileId_fkey"
    FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;