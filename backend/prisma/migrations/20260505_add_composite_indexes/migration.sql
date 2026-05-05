-- Add composite indexes for soft-delete queries
CREATE INDEX IF NOT EXISTS "Account_userId_deletedAt_idx" ON "Account"("userId", "deletedAt");
CREATE INDEX IF NOT EXISTS "CreditCard_userId_deletedAt_idx" ON "CreditCard"("userId", "deletedAt");
CREATE INDEX IF NOT EXISTS "CreditCard_accountId_idx" ON "CreditCard"("accountId");
CREATE INDEX IF NOT EXISTS "Category_userId_deletedAt_idx" ON "Category"("userId", "deletedAt");
CREATE INDEX IF NOT EXISTS "Transaction_userId_deletedAt_idx" ON "Transaction"("userId", "deletedAt");
CREATE INDEX IF NOT EXISTS "Budget_userId_deletedAt_idx" ON "Budget"("userId", "deletedAt");