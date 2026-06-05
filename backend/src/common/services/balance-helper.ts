/**
 * Balance Operations Helper — Atomic read-lock-compute-encrypt-write.
 *
 * Since financial fields are now encrypted strings (not Decimal),
 * Prisma's native increment/decrement operations don't work.
 * This module provides atomic balance operations using raw SQL with FOR UPDATE locks.
 *
 * Usage in services:
 *   import { atomicBalanceUpdate } from '../common/services/balance-helper';
 *
 *   // Instead of: { balance: { increment: amount } }
 *   // Use: await atomicBalanceUpdate(tx, accountId, userId, +amount, encryptionService)
 */

import { EncryptionService } from './encryption.service';

type TransactionClient = any;

interface BalanceRow {
  id: string;
  userId: string;
  balance: string;
}

/**
 * Atomically update an account's encrypted balance.
 * Uses SELECT FOR UPDATE to prevent concurrent modifications.
 *
 * @param tx - Prisma transaction client (from $transaction callback)
 * @param accountId - The account ID
 * @param userId - The user ID (for security: must own the account)
 * @param delta - The amount to add (positive) or subtract (negative)
 * @param encryption - The EncryptionService instance
 * @param checkOverdraft - If true, throws if balance would go below 0
 * @returns The new balance as a plain number
 */
export async function atomicBalanceUpdate(
  tx: TransactionClient,
  accountId: string,
  userId: string,
  delta: number,
  encryption: EncryptionService,
  checkOverdraft = false,
): Promise<number> {
  // Lock the row and get the current encrypted balance
  const rows = await tx.$queryRaw<BalanceRow[]>`
    SELECT id, "userId", balance FROM "Account" 
    WHERE id = ${accountId} AND "userId" = ${userId} 
    FOR UPDATE
  `;

  if (!rows || rows.length === 0) {
    throw new Error(
      `Account ${accountId} not found or does not belong to user ${userId}`,
    );
  }

  const currentEncrypted = rows[0].balance;
  const currentBalance = encryption.isEnabled()
    ? Number(encryption.decryptDecimal(currentEncrypted))
    : Number(currentEncrypted);

  const newBalance = currentBalance + delta;

  if (checkOverdraft && newBalance < 0) {
    throw new Error(
      `Saldo insuficiente. Saldo atual: ${currentBalance}, tentativa: ${delta}`,
    );
  }

  const newEncrypted = encryption.encryptDecimal(newBalance);

  await tx.account.update({
    where: { id: accountId },
    data: { balance: newEncrypted },
  });

  return newBalance;
}

/**
 * Get the decrypted balance of an account.
 * Works with both encrypted ('enc:...') and plaintext values.
 */
export function decryptBalance(
  balanceStr: string | null,
  encryption: EncryptionService,
): number {
  if (balanceStr === null || balanceStr === undefined) return 0;
  if (encryption.isEnabled() && balanceStr.startsWith('enc:')) {
    return Number(encryption.decryptDecimal(balanceStr));
  }
  return Number(balanceStr);
}

/**
 * Encrypt a numeric amount for storage.
 * Returns plaintext if encryption is disabled.
 */
export function encryptAmount(
  amount: number | string,
  encryption: EncryptionService,
): string {
  if (encryption.isEnabled()) {
    return encryption.encryptDecimal(amount) ?? String(amount);
  }
  return String(amount);
}

/**
 * Decrypt an encrypted amount for computation.
 * Returns a number for arithmetic operations.
 */
export function decryptAmount(
  encrypted: string | null | undefined,
  encryption: EncryptionService,
): number {
  if (encrypted === null || encrypted === undefined) return 0;
  if (encryption.isEnabled() && encrypted.startsWith('enc:')) {
    return Number(encryption.decryptDecimal(encrypted));
  }
  return Number(encrypted);
}

/**
 * Batch-decrypt an array of records that have encrypted amount fields.
 * Mutates the records in-place, replacing the encrypted strings with numbers.
 * This allows the API responses to return numeric values while the DB stores encrypted strings.
 */
export function decryptRecordAmounts(
  records: Record<string, any>[],
  fields: string[],
  encryption: EncryptionService,
): Record<string, any>[] {
  for (const record of records) {
    for (const field of fields) {
      if (record[field] !== null && record[field] !== undefined) {
        if (
          encryption.isEnabled() &&
          String(record[field]).startsWith('enc:')
        ) {
          record[field] = Number(
            encryption.decryptDecimal(String(record[field])),
          );
        } else {
          record[field] = Number(record[field]);
        }
      }
    }
  }
  return records;
}

/**
 * Decrypt a single record's amount fields.
 * Returns a new object with numeric values.
 */
export function decryptRecord(
  record: Record<string, any>,
  fields: string[],
  encryption: EncryptionService,
): Record<string, any> {
  for (const field of fields) {
    if (record[field] !== null && record[field] !== undefined) {
      if (encryption.isEnabled() && String(record[field]).startsWith('enc:')) {
        (record as any)[field] = Number(
          encryption.decryptDecimal(String(record[field])),
        );
      } else {
        (record as any)[field] = Number(record[field]);
      }
    }
  }
  return record;
}
