-- Refactor AuditLog: add hash chain, severity, rename columns, change types
-- Step 1: Add new columns
ALTER TABLE "AuditLog" ADD COLUMN "actorId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "targetType" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "targetId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "severity" TEXT NOT NULL DEFAULT 'info';
ALTER TABLE "AuditLog" ADD COLUMN "hash" TEXT NOT NULL DEFAULT 'pending';

-- Step 2: Migrate data from old columns to new columns
UPDATE "AuditLog" SET "actorId" = "userId",
                       "targetType" = "resource",
                       "targetId" = "resourceId",
                       "severity" = CASE WHEN "action" LIKE '%FAILED%' OR "action" LIKE '%DELETE%' THEN 'warn' ELSE 'info' END;

-- Step 3: Convert previousState/newState from TEXT to JSONB (if they exist as text, create new jsonb columns)
ALTER TABLE "AuditLog" ADD COLUMN "previousState_new" JSONB;
ALTER TABLE "AuditLog" ADD COLUMN "newState_new" JSONB;

-- Migrate existing text data to jsonb
UPDATE "AuditLog" SET "previousState_new" = CASE WHEN "previousState" IS NOT NULL AND "previousState" != '' THEN "previousState"::jsonb ELSE NULL END,
                       "newState_new" = CASE WHEN "newState" IS NOT NULL AND "newState" != '' THEN "newState"::jsonb ELSE NULL END;

-- Step 4: Drop old columns, rename new ones
ALTER TABLE "AuditLog" DROP COLUMN "previousState";
ALTER TABLE "AuditLog" RENAME COLUMN "previousState_new" TO "previousState";

ALTER TABLE "AuditLog" DROP COLUMN "newState";
ALTER TABLE "AuditLog" RENAME COLUMN "newState_new" TO "newState";

-- Step 5: Change details from TEXT to JSONB
ALTER TABLE "AuditLog" ADD COLUMN "details_new" JSONB NOT NULL DEFAULT '{}';
UPDATE "AuditLog" SET "details_new" = CASE WHEN "details" IS NOT NULL AND "details" != '' THEN "details"::jsonb ELSE '{}'::jsonb END;
ALTER TABLE "AuditLog" DROP COLUMN "details";
ALTER TABLE "AuditLog" RENAME COLUMN "details_new" TO "details";

-- Step 6: Rename currentHash to hash
ALTER TABLE "AuditLog" RENAME COLUMN "currentHash" TO "hash";

-- Step 7: Drop old columns that are replaced
ALTER TABLE "AuditLog" DROP COLUMN "userId";
ALTER TABLE "AuditLog" DROP COLUMN "resource";
ALTER TABLE "AuditLog" DROP COLUMN "resourceId";
ALTER TABLE "AuditLog" DROP COLUMN "sessionId";

-- Step 8: Drop old indexes, create new ones
DROP INDEX IF EXISTS "AuditLog_userId_idx";
DROP INDEX IF EXISTS "AuditLog_resource_idx";
DROP INDEX IF EXISTS "AuditLog_action_idx";

CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");
CREATE INDEX "AuditLog_severity_idx" ON "AuditLog"("severity");

-- Step 9: Add foreign key constraint for actorId -> User.id (with SET NULL on delete)
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_user_fkey";
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actor_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL;