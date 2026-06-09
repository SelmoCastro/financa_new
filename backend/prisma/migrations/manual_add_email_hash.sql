-- Migration: Add emailHash column for encrypted PII lookups
-- This enables User email/name encryption while keeping email-based lookups functional

-- Step 1: Add column (nullable initially for backfill)
ALTER TABLE "User" ADD COLUMN "emailHash" TEXT;

-- Step 2: Backfill existing rows with SHA-256 hash of lowercase email
-- This must run BEFORE adding the NOT NULL and UNIQUE constraints
UPDATE "User" SET "emailHash" = encode(sha256(lower(trim("email"))::bytea), 'hex') WHERE "emailHash" IS NULL;

-- Step 3: Enforce constraints
ALTER TABLE "User" ALTER COLUMN "emailHash" SET NOT NULL;
ALTER TABLE "User" ADD CONSTRAINT "User_emailHash_key" UNIQUE ("emailHash");
