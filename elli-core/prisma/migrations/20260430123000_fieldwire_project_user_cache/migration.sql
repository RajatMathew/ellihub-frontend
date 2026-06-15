-- CreateTable
CREATE TABLE "FieldwireProjectUser" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fieldwireProjectId" TEXT NOT NULL,
    "fieldwireUserId" INTEGER NOT NULL,
    "accountId" INTEGER,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "company" TEXT,
    "jobTitle" TEXT,
    "phoneNumber" TEXT,
    "photoUrl" TEXT,
    "role" TEXT,
    "isAdmin" BOOLEAN,
    "isApproved" BOOLEAN,
    "userDeletedAt" TIMESTAMP(3),
    "fieldwireCreatedAt" TIMESTAMP(3) NOT NULL,
    "fieldwireUpdatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldwireProjectUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FieldwireProjectUser_projectId_fieldwireUserId_key" ON "FieldwireProjectUser"("projectId", "fieldwireUserId");

-- CreateIndex
CREATE INDEX "FieldwireProjectUser_fieldwireProjectId_idx" ON "FieldwireProjectUser"("fieldwireProjectId");

-- CreateIndex
CREATE INDEX "FieldwireProjectUser_fieldwireUserId_idx" ON "FieldwireProjectUser"("fieldwireUserId");

-- CreateIndex
CREATE INDEX "FieldwireProjectUser_lastSyncedAt_idx" ON "FieldwireProjectUser"("lastSyncedAt");

-- AddForeignKey
ALTER TABLE "FieldwireProjectUser" ADD CONSTRAINT "FieldwireProjectUser_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
