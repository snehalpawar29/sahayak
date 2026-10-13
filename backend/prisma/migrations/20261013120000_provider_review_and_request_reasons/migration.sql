-- Additive migration: preserve existing providers, resources, and requests.
CREATE TYPE "ProviderVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "Provider"
  ADD COLUMN "verificationStatus" "ProviderVerificationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "verificationRejectionReason" TEXT,
  ADD COLUMN "verificationDocumentName" TEXT,
  ADD COLUMN "verificationDocumentMimeType" TEXT,
  ADD COLUMN "verificationDocumentData" TEXT,
  ADD COLUMN "verifiedAt" TIMESTAMP(3);

UPDATE "Provider"
SET "verificationStatus" = 'APPROVED', "verifiedAt" = COALESCE("updatedAt", CURRENT_TIMESTAMP)
WHERE "verified" = TRUE;

ALTER TABLE "EmergencyRequest"
  ADD COLUMN "rejectionReason" TEXT;
