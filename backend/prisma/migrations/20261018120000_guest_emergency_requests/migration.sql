-- Allow emergency requests without a registered citizen account.
ALTER TABLE "EmergencyRequest"
  ALTER COLUMN "userId" DROP NOT NULL,
  ADD COLUMN "requesterName" TEXT,
  ADD COLUMN "requesterEmail" TEXT;

