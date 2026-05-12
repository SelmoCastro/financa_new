-- AlterTable: Add integrity chain fields to AuditLog
ALTER TABLE "AuditLog" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "sessionId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "previousState" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "newState" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "previousHash" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "currentHash" TEXT;

-- CreateIndex: Add index on action for faster filtering
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");