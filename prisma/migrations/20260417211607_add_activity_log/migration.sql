-- CreateTable
CREATE TABLE "activityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activityLog_userId_idx" ON "activityLog"("userId");

-- CreateIndex
CREATE INDEX "activityLog_entityType_entityId_createdAt_idx" ON "activityLog"("entityType", "entityId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "activityLog_createdAt_idx" ON "activityLog"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "activityLog" ADD CONSTRAINT "activityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
