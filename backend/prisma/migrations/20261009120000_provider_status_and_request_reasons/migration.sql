-- Preserve all existing provider records and verification state.
CREATE TYPE "ProviderStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "Provider"
  ADD COLUMN "status" "ProviderStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "rejectionReason" TEXT;

UPDATE "Provider"
SET "status" = CASE WHEN "verified" = TRUE THEN 'APPROVED'::"ProviderStatus" ELSE 'PENDING'::"ProviderStatus" END;

ALTER TABLE "EmergencyRequest"
  ADD COLUMN "rejectionReason" TEXT;
