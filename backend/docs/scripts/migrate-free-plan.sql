-- V14 Migration: Set all users without subscription to 'free' plan
-- Run this BEFORE deploying the code change that defaults new users to 'free'

-- Step 1: Create subscription records with 'free' plan for users who don't have one
INSERT INTO "Subscription" ("userId", plan, status, "createdAt", "updatedAt")
SELECT u.id, 'free', 'active', NOW(), NOW()
FROM "User" u
WHERE NOT EXISTS (
  SELECT 1 FROM "Subscription" s WHERE s."userId" = u.id
);

-- Step 2: Downgrade existing 'premium' subscriptions with no expiration to 'free'
-- (These were auto-created by the old code that defaulted to 'premium')
UPDATE "Subscription"
SET plan = 'free', "updatedAt" = NOW()
WHERE plan = 'premium'
  AND status = 'active'
  AND "expiresAt" IS NULL;