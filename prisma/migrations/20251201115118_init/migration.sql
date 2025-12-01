-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "directory";

-- CreateTable
CREATE TABLE "directory"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "directory"."User"("email");
