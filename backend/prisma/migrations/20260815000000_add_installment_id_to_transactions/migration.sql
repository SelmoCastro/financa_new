-- Add a stable identifier from transaction rows back to their installment group.
-- Legacy rows remain NULL when no persisted, unambiguous relationship exists.
-- The application refuses ambiguous legacy installment deletion rather than guessing.
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "installmentId" TEXT;

CREATE INDEX IF NOT EXISTS "Transaction_installmentId_idx" ON "Transaction"("installmentId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Transaction_installmentId_fkey'
  ) THEN
    ALTER TABLE "Transaction"
      ADD CONSTRAINT "Transaction_installmentId_fkey"
      FOREIGN KEY ("installmentId")
      REFERENCES "CreditCardInstallment"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
