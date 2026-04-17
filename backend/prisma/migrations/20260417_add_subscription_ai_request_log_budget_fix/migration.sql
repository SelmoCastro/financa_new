-- Add Subscription and AiRequestLog tables
-- Also fix Budget table to use categoryId FK instead of category string

-- Step 1: Add categoryId column to Budget if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Budget' AND column_name = 'categoryId') THEN
    ALTER TABLE "Budget" ADD COLUMN "categoryId" TEXT;
  END IF;
END $$;

-- Step 2: Populate categoryId from Category table where categoryId is NULL
UPDATE "Budget"
SET "categoryId" = "Category"."id"
FROM "Category"
WHERE "Budget"."categoryId" IS NULL
  AND "Category"."name" = "Budget"."category"
  AND "Category"."userId" = "Budget"."userId";

-- Step 3: Drop the legacy category string column if it still exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Budget' AND column_name = 'category') THEN
    -- Drop unique constraint on (userId, category) if exists
    ALTER TABLE "Budget" DROP CONSTRAINT IF EXISTS "Budget_userId_category_key";
    ALTER TABLE "Budget" DROP COLUMN "category";
  END IF;
END $$;

-- Step 4: Make categoryId NOT NULL
ALTER TABLE "Budget" ALTER COLUMN "categoryId" SET NOT NULL;

-- Step 5: Add unique constraint on (userId, categoryId)
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_userId_categoryId_key" UNIQUE ("userId", "categoryId");

-- Step 6: Add foreign key
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 7: Create index on categoryId
CREATE INDEX IF NOT EXISTS "Budget_categoryId_idx" ON "Budget"("categoryId");

-- Step 8: Create Subscription table
CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- Step 9: Add unique constraint on userId for Subscription
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_key" UNIQUE ("userId");

-- Step 10: Add foreign key for Subscription
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 11: Create index on userId for Subscription
CREATE INDEX IF NOT EXISTS "Subscription_userId_idx" ON "Subscription"("userId");

-- Step 12: Create AiRequestLog table
CREATE TABLE IF NOT EXISTS "AiRequestLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiRequestLog_pkey" PRIMARY KEY ("id")
);

-- Step 13: Add foreign key for AiRequestLog
ALTER TABLE "AiRequestLog" ADD CONSTRAINT "AiRequestLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 14: Create index on (userId, createdAt) for AiRequestLog
CREATE INDEX IF NOT EXISTS "AiRequestLog_userId_createdAt_idx" ON "AiRequestLog"("userId", "createdAt");