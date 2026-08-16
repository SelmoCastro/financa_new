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

import type { Prisma } from '@prisma/client';
import { EncryptionService } from './encryption.service';

type TransactionClient = Prisma.TransactionClient;

interface BalanceRow {
  id: string;
  userId: string;
  balance: string;
}

function toStringValue(value: unknown): string | null {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }
  return null;
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

  const newEncrypted: string = encryption.isEnabled()
    ? (encryption.encryptDecimal(newBalance) ?? '0.00')
    : String(newBalance);

  await tx.account.update({
    where: { id: accountId },
    data: { balance: newEncrypted ?? '0.00' },
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
  records: Record<string, unknown>[],
  fields: string[],
  encryption: EncryptionService,
): Record<string, unknown>[] {
  for (const record of records) {
    for (const field of fields) {
      const value = record[field];
      const textValue = toStringValue(value);
      if (textValue !== null) {
        if (encryption.isEnabled() && textValue.startsWith('enc:')) {
          record[field] = Number(encryption.decryptDecimal(textValue));
        } else {
          record[field] = Number(textValue);
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
  record: Record<string, unknown>,
  fields: string[],
  encryption: EncryptionService,
): Record<string, unknown> {
  for (const field of fields) {
    const value = record[field];
    const textValue = toStringValue(value);
    if (textValue !== null) {
      if (encryption.isEnabled() && textValue.startsWith('enc:')) {
        record[field] = Number(encryption.decryptDecimal(textValue));
      } else {
        record[field] = Number(textValue);
      }
    }
  }
  return record;
}
