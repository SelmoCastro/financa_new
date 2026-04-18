-- Add indexes for Budget and Goal models to improve query performance

-- Budget: add standalone userId index (unique on [userId,categoryId] doesn't cover userId-only queries)
CREATE INDEX IF NOT EXISTS "Budget_userId_idx" ON "Budget"("userId");

-- Goal: add indexes for common query patterns
CREATE INDEX IF NOT EXISTS "Goal_userId_idx" ON "Goal"("userId");
CREATE INDEX IF NOT EXISTS "Goal_userId_deletedAt_idx" ON "Goal"("userId", "deletedAt");