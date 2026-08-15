-- Add a stable identifier from transaction rows back to their installment group.
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "installmentId" TEXT;

-- Deterministic, non-destructive backfill for legacy data.
-- We only backfill partitions where the installment rows and each installment slot
-- have the same cardinality, which avoids making an ambiguous guess when the data
-- is incomplete or has already been partially modified.
WITH installment_counts AS (
  SELECT
    i."userId",
    i."creditCardId",
    i."installmentCount",
    COUNT(*) AS installment_groups
  FROM "CreditCardInstallment" i
  GROUP BY 1, 2, 3
),
transaction_slot_counts AS (
  SELECT
    t."userId",
    t."creditCardId",
    t."installmentCount",
    t."currentInstallment",
    COUNT(*) AS slot_count
  FROM "Transaction" t
  WHERE t."creditCardId" IS NOT NULL
    AND t."installmentCount" IS NOT NULL
    AND t."currentInstallment" IS NOT NULL
  GROUP BY 1, 2, 3, 4
),
transaction_partitions AS (
  SELECT
    t."userId",
    t."creditCardId",
    t."installmentCount",
    MIN(t.slot_count) AS min_slot_count,
    MAX(t.slot_count) AS max_slot_count,
    COUNT(*) AS slot_total
  FROM transaction_slot_counts t
  GROUP BY 1, 2, 3
),
eligible_partitions AS (
  SELECT
    ic."userId",
    ic."creditCardId",
    ic."installmentCount"
  FROM installment_counts ic
  JOIN transaction_partitions tp
    ON tp."userId" = ic."userId"
   AND tp."creditCardId" = ic."creditCardId"
   AND tp."installmentCount" = ic."installmentCount"
  WHERE ic.installment_groups = tp.min_slot_count
    AND tp.min_slot_count = tp.max_slot_count
    AND tp.slot_total = ic."installmentCount"
),
installment_groups AS (
  SELECT
    i.id AS installment_id,
    i."userId",
    i."creditCardId",
    i."installmentCount",
    ROW_NUMBER() OVER (
      PARTITION BY i."userId", i."creditCardId", i."installmentCount"
      ORDER BY i."createdAt", i."startDate", i.id
    ) AS group_seq
  FROM "CreditCardInstallment" i
  JOIN eligible_partitions ep
    USING ("userId", "creditCardId", "installmentCount")
),
transaction_groups AS (
  SELECT
    t.id AS transaction_id,
    t."userId",
    t."creditCardId",
    t."installmentCount",
    t."currentInstallment",
    ROW_NUMBER() OVER (
      PARTITION BY t."userId", t."creditCardId", t."installmentCount", t."currentInstallment"
      ORDER BY t."createdAt", t.date, t.id
    ) AS group_seq
  FROM "Transaction" t
  JOIN eligible_partitions ep
    USING ("userId", "creditCardId", "installmentCount")
  WHERE t."creditCardId" IS NOT NULL
    AND t."installmentCount" IS NOT NULL
    AND t."currentInstallment" IS NOT NULL
    AND t."installmentId" IS NULL
)
UPDATE "Transaction" t
SET "installmentId" = ig.installment_id
FROM transaction_groups tg
JOIN installment_groups ig
  ON ig."userId" = tg."userId"
 AND ig."creditCardId" = tg."creditCardId"
 AND ig."installmentCount" = tg."installmentCount"
 AND ig.group_seq = tg.group_seq
WHERE t.id = tg.transaction_id;

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
