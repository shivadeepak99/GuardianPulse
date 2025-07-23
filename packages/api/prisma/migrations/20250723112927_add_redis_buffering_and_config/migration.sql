-- AlterTable
ALTER TABLE "incidents" ADD COLUMN     "preIncidentData" JSONB;

-- CreateTable
CREATE TABLE "app_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "app_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_config_key_key" ON "app_config"("key");

-- CreateIndex
CREATE INDEX "app_config_key_idx" ON "app_config"("key");

-- CreateIndex
CREATE INDEX "app_config_category_idx" ON "app_config"("category");

-- CreateIndex
CREATE INDEX "app_config_isActive_idx" ON "app_config"("isActive");
