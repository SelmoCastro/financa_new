-- ConvertDecimalToText: Migrate all financial Decimal columns to TEXT
-- This enables encryption of financial data at the application level.
-- Data is preserved using ::TEXT conversion.

-- Account
ALTER TABLE "Account" ALTER COLUMN "balance" TYPE TEXT USING "balance"::TEXT;

-- Transaction
ALTER TABLE "Transaction" ALTER COLUMN "amount" TYPE TEXT USING "amount"::TEXT;

-- CreditCard
ALTER TABLE "CreditCard" ALTER COLUMN "limit" TYPE TEXT USING "limit"::TEXT;

-- Budget
ALTER TABLE "Budget" ALTER COLUMN "amount" TYPE TEXT USING "amount"::TEXT;

-- Goal
ALTER TABLE "Goal" ALTER COLUMN "targetAmount" TYPE TEXT USING "targetAmount"::TEXT;
ALTER TABLE "Goal" ALTER COLUMN "currentAmount" TYPE TEXT USING "currentAmount"::TEXT;

-- TransactionInvite
ALTER TABLE "TransactionInvite" ALTER COLUMN "amount" TYPE TEXT USING "amount"::TEXT;

-- CreditCardInstallment
ALTER TABLE "CreditCardInstallment" ALTER COLUMN "totalAmount" TYPE TEXT USING "totalAmount"::TEXT;
ALTER TABLE "CreditCardInstallment" ALTER COLUMN "amountPerMonth" TYPE TEXT USING "amountPerMonth"::TEXT;
ALTER TABLE "CreditCardInstallment" ALTER COLUMN "entryAmount" TYPE TEXT USING "entryAmount"::TEXT;

-- CreditCardInvoice
ALTER TABLE "CreditCardInvoice" ALTER COLUMN "totalAmount" TYPE TEXT USING "totalAmount"::TEXT;
ALTER TABLE "CreditCardInvoice" ALTER COLUMN "paidAmount" TYPE TEXT USING "paidAmount"::TEXT;

-- RecurringTransaction
ALTER TABLE "RecurringTransaction" ALTER COLUMN "amount" TYPE TEXT USING "amount"::TEXT;