-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "guardian_invitations" (
    "id" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeEmail" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "message" TEXT,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "guardian_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardian_relationships" (
    "id" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "guardian_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guardian_invitations_inviterId_idx" ON "guardian_invitations"("inviterId");

-- CreateIndex
CREATE INDEX "guardian_invitations_inviteeEmail_idx" ON "guardian_invitations"("inviteeEmail");

-- CreateIndex
CREATE INDEX "guardian_invitations_status_idx" ON "guardian_invitations"("status");

-- CreateIndex
CREATE INDEX "guardian_invitations_createdAt_idx" ON "guardian_invitations"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "guardian_invitations_inviterId_inviteeEmail_key" ON "guardian_invitations"("inviterId", "inviteeEmail");

-- CreateIndex
CREATE INDEX "guardian_relationships_wardId_idx" ON "guardian_relationships"("wardId");

-- CreateIndex
CREATE INDEX "guardian_relationships_guardianId_idx" ON "guardian_relationships"("guardianId");

-- CreateIndex
CREATE INDEX "guardian_relationships_isActive_idx" ON "guardian_relationships"("isActive");

-- CreateIndex
CREATE INDEX "guardian_relationships_createdAt_idx" ON "guardian_relationships"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "guardian_relationships_wardId_guardianId_key" ON "guardian_relationships"("wardId", "guardianId");

-- AddForeignKey
ALTER TABLE "guardian_invitations" ADD CONSTRAINT "guardian_invitations_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_relationships" ADD CONSTRAINT "guardian_relationships_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_relationships" ADD CONSTRAINT "guardian_relationships_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
