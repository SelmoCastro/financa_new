-- DropIndex
DROP INDEX IF EXISTS "Budget_categoryId_idx";

-- DropForeignKey
ALTER TABLE "Budget" DROP CONSTRAINT IF EXISTS "Budget_categoryId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Budget_userId_category_key";

-- Populate categoryId from Category table where categoryId is NULL
UPDATE "Budget"
SET "categoryId" = "Category"."id"
FROM "Category"
WHERE "Budget"."categoryId" IS NULL
  AND "Category"."name" = "Budget"."category"
  AND "Category"."userId" = "Budget"."userId";

-- Drop the legacy category string column
ALTER TABLE "Budget" DROP COLUMN IF EXISTS "category";

-- Make categoryId NOT NULL
ALTER TABLE "Budget" ALTER COLUMN "categoryId" SET NOT NULL;

-- Add unique constraint on (userId, categoryId)
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_userId_categoryId_key" UNIQUE ("userId", "categoryId");

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Budget_categoryId_idx" ON "Budget"("categoryId");