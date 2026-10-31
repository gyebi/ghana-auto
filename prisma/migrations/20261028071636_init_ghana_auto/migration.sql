-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('DRAFT', 'AVAILABLE', 'RESERVED', 'SOLD', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InventoryType" AS ENUM ('LOCAL_STOCK', 'IMPORT_ORDER', 'IN_TRANSIT');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "EnquiryType" AS ENUM ('VEHICLE_ENQUIRY', 'IMPORT_REQUEST', 'GENERAL_ENQUIRY');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'IN_PROGRESS', 'CLOSED');

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "stockCode" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "price" DECIMAL(14,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'GHS',
    "showPrice" BOOLEAN NOT NULL DEFAULT true,
    "bodyType" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "transmission" TEXT NOT NULL,
    "fuelType" TEXT NOT NULL,
    "mileage" INTEGER,
    "location" TEXT,
    "description" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "status" "VehicleStatus" NOT NULL DEFAULT 'DRAFT',
    "inventoryType" "InventoryType" NOT NULL DEFAULT 'LOCAL_STOCK',
    "originCountry" TEXT,
    "estimatedLeadTimeMinDays" INTEGER,
    "estimatedLeadTimeMaxDays" INTEGER,
    "estimatedArrivalDate" TIMESTAMP(3),
    "shippingCostEstimate" DECIMAL(14,2),
    "clearingCostEstimate" DECIMAL(14,2),
    "otherImportCostEstimate" DECIMAL(14,2),
    "importCurrency" VARCHAR(3),
    "importNotes" TEXT,
    "estimateUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleImage" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "cloudinaryPublicId" TEXT,
    "imageUrl" TEXT NOT NULL,
    "altText" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffUser" (
    "id" TEXT NOT NULL,
    "firebaseUid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "role" "StaffRole" NOT NULL DEFAULT 'STAFF',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL,
    "type" "EnquiryType" NOT NULL DEFAULT 'GENERAL_ENQUIRY',
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "message" TEXT,
    "vehicleId" TEXT,
    "vehicleStockCodeSnapshot" TEXT,
    "vehicleTitleSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "businessName" TEXT NOT NULL DEFAULT 'Ghana Auto',
    "tagline" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Ghana',
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,
    "tiktokUrl" TEXT,
    "youtubeUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentSection" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "body" TEXT,
    "imageUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_stockCode_key" ON "Vehicle"("stockCode");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_slug_key" ON "Vehicle"("slug");

-- CreateIndex
CREATE INDEX "Vehicle_status_published_idx" ON "Vehicle"("status", "published");

-- CreateIndex
CREATE INDEX "Vehicle_inventoryType_idx" ON "Vehicle"("inventoryType");

-- CreateIndex
CREATE INDEX "Vehicle_make_model_idx" ON "Vehicle"("make", "model");

-- CreateIndex
CREATE INDEX "Vehicle_featured_idx" ON "Vehicle"("featured");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleImage_cloudinaryPublicId_key" ON "VehicleImage"("cloudinaryPublicId");

-- CreateIndex
CREATE INDEX "VehicleImage_vehicleId_position_idx" ON "VehicleImage"("vehicleId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "StaffUser_firebaseUid_key" ON "StaffUser"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "StaffUser_email_key" ON "StaffUser"("email");

-- CreateIndex
CREATE INDEX "Enquiry_vehicleId_idx" ON "Enquiry"("vehicleId");

-- CreateIndex
CREATE INDEX "Enquiry_status_createdAt_idx" ON "Enquiry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Enquiry_type_idx" ON "Enquiry"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ContentSection_key_key" ON "ContentSection"("key");

-- AddForeignKey
ALTER TABLE "VehicleImage" ADD CONSTRAINT "VehicleImage_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- ==========================================
-- GHANA AUTO: DATABASE SAFETY CONSTRAINTS
-- ==========================================

-- Maximum one cover photograph per vehicle.
CREATE UNIQUE INDEX "VehicleImage_one_cover_per_vehicle"
ON "VehicleImage" ("vehicleId")
WHERE "isCover" = true;

-- Prevent negative vehicle prices.
ALTER TABLE "Vehicle"
ADD CONSTRAINT "Vehicle_price_nonnegative"
CHECK ("price" IS NULL OR "price" >= 0);

-- Prevent negative import cost estimates.
ALTER TABLE "Vehicle"
ADD CONSTRAINT "Vehicle_shipping_nonnegative"
CHECK (
  "shippingCostEstimate" IS NULL
  OR "shippingCostEstimate" >= 0
);

ALTER TABLE "Vehicle"
ADD CONSTRAINT "Vehicle_clearing_nonnegative"
CHECK (
  "clearingCostEstimate" IS NULL
  OR "clearingCostEstimate" >= 0
);

ALTER TABLE "Vehicle"
ADD CONSTRAINT "Vehicle_other_import_cost_nonnegative"
CHECK (
  "otherImportCostEstimate" IS NULL
  OR "otherImportCostEstimate" >= 0
);

-- Mileage cannot be negative.
ALTER TABLE "Vehicle"
ADD CONSTRAINT "Vehicle_mileage_nonnegative"
CHECK ("mileage" IS NULL OR "mileage" >= 0);

-- Import lead times cannot be negative.
ALTER TABLE "Vehicle"
ADD CONSTRAINT "Vehicle_lead_time_nonnegative"
CHECK (
  ("estimatedLeadTimeMinDays" IS NULL
    OR "estimatedLeadTimeMinDays" >= 0)
  AND
  ("estimatedLeadTimeMaxDays" IS NULL
    OR "estimatedLeadTimeMaxDays" >= 0)
);

-- Minimum lead time must not exceed maximum.
ALTER TABLE "Vehicle"
ADD CONSTRAINT "Vehicle_lead_time_range_valid"
CHECK (
  "estimatedLeadTimeMinDays" IS NULL
  OR "estimatedLeadTimeMaxDays" IS NULL
  OR "estimatedLeadTimeMinDays" <= "estimatedLeadTimeMaxDays"
);
