-- DropIndex
DROP INDEX IF EXISTS "CreditCard_accountId_idx";

-- AlterTable: Allow CreditCard to exist without an associated account
ALTER TABLE "CreditCard" ALTER COLUMN "accountId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "CreditCard_accountId_idx" ON "CreditCard"("accountId");