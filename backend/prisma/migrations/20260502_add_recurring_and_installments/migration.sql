-- CreateTable: RecurringTransaction
CREATE TABLE "RecurringTransaction" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "type" TEXT NOT NULL,
    "categoryId" TEXT,
    "accountId" TEXT,
    "creditCardId" TEXT,
    "dueDay" INTEGER NOT NULL,
    "startMonth" INTEGER NOT NULL DEFAULT 1,
    "endMonth" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CreditCardInstallment
CREATE TABLE "CreditCardInstallment" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "installmentCount" INTEGER NOT NULL,
    "currentInstallment" INTEGER NOT NULL DEFAULT 0,
    "amountPerMonth" DECIMAL(15,2) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "accountId" TEXT,
    "creditCardId" TEXT NOT NULL,
    "categoryId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditCardInstallment_pkey" PRIMARY KEY ("id")
);

-- Add Foreign Keys
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CreditCardInstallment" ADD CONSTRAINT "CreditCardInstallment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditCardInstallment" ADD CONSTRAINT "CreditCardInstallment_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditCardInstallment" ADD CONSTRAINT "CreditCardInstallment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreditCardInstallment" ADD CONSTRAINT "CreditCardInstallment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create Indexes
CREATE INDEX "RecurringTransaction_userId_idx" ON "RecurringTransaction"("userId");
CREATE INDEX "RecurringTransaction_userId_isActive_idx" ON "RecurringTransaction"("userId", "isActive");

CREATE INDEX "CreditCardInstallment_userId_idx" ON "CreditCardInstallment"("userId");
CREATE INDEX "CreditCardInstallment_creditCardId_idx" ON "CreditCardInstallment"("creditCardId");
CREATE INDEX "CreditCardInstallment_isActive_idx" ON "CreditCardInstallment"("isActive");
