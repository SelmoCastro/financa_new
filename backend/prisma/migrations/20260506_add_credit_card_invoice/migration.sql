-- CreateTable: CreditCardInvoice (faturas de cartão de crédito)
CREATE TABLE "CreditCardInvoice" (
    "id"             TEXT         NOT NULL,
    "creditCardId"   TEXT         NOT NULL,
    "referenceMonth" INTEGER      NOT NULL, -- 1-12
    "referenceYear"  INTEGER      NOT NULL,
    "closingDate"    TIMESTAMP(3) NOT NULL,
    "dueDate"        TIMESTAMP(3) NOT NULL,
    "totalAmount"    DECIMAL(15,2) NOT NULL DEFAULT 0,
    "paidAmount"     DECIMAL(15,2) NOT NULL DEFAULT 0,
    "isPaid"         BOOLEAN      NOT NULL DEFAULT false,
    "paidAt"         TIMESTAMP(3),
    "userId"         TEXT         NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditCardInvoice_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CreditCardInvoice_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CreditCardInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Índices para CreditCardInvoice
CREATE UNIQUE INDEX "CreditCardInvoice_creditCardId_referenceMonth_refer_key" ON "CreditCardInvoice"("creditCardId", "referenceMonth", "referenceYear");
CREATE INDEX "CreditCardInvoice_userId_idx" ON "CreditCardInvoice"("userId");
CREATE INDEX "CreditCardInvoice_creditCardId_idx" ON "CreditCardInvoice"("creditCardId");
CREATE INDEX "CreditCardInvoice_creditCardId_isPaid_idx" ON "CreditCardInvoice"("creditCardId", "isPaid");

-- AlterTable: Transaction ganha campo invoiceId (FK opcional para CreditCardInvoice)
ALTER TABLE "Transaction" ADD COLUMN "invoiceId" TEXT;

-- Índice para invoiceId em Transaction
CREATE INDEX "Transaction_invoiceId_idx" ON "Transaction"("invoiceId");

-- FK de Transaction → CreditCardInvoice
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CreditCardInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
