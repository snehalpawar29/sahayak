ALTER TABLE "Provider"
  ADD COLUMN "verificationDocumentKey" TEXT,
  ADD COLUMN "verificationDocumentName" TEXT,
  ADD COLUMN "verificationDocumentType" TEXT,
  ADD COLUMN "submittedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedAt" TIMESTAMP(3);
