-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('FALL_DETECTED', 'SOS_MANUAL', 'THROWN_AWAY', 'FAKE_SHUTDOWN');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('AUDIO', 'VIDEO', 'SENSOR_LOG');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phoneNumber" TEXT;

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "checksum" TEXT,
    "metadata" JSONB,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "incidents_wardId_idx" ON "incidents"("wardId");

-- CreateIndex
CREATE INDEX "incidents_type_idx" ON "incidents"("type");

-- CreateIndex
CREATE INDEX "incidents_isActive_idx" ON "incidents"("isActive");

-- CreateIndex
CREATE INDEX "incidents_triggeredAt_idx" ON "incidents"("triggeredAt");

-- CreateIndex
CREATE INDEX "incidents_severity_idx" ON "incidents"("severity");

-- CreateIndex
CREATE INDEX "evidence_incidentId_idx" ON "evidence"("incidentId");

-- CreateIndex
CREATE INDEX "evidence_type_idx" ON "evidence"("type");

-- CreateIndex
CREATE INDEX "evidence_createdAt_idx" ON "evidence"("createdAt");

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
