-- Add optimistic concurrency control version counters.
ALTER TABLE "Account" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CreditCard" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Transaction" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
