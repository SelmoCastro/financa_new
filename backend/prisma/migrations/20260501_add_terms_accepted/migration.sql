-- AlterTable: Add terms of service acceptance tracking
ALTER TABLE "User" ADD COLUMN "termsAccepted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "termsAcceptedAt" TIMESTAMP;

-- Mark existing users as having accepted terms (grandfather clause)
UPDATE "User" SET "termsAccepted" = true, "termsAcceptedAt" = "createdAt" WHERE "termsAccepted" = false;