/**
 * encrypt-existing-data.ts
 *
 * One-time migration: encrypts all existing plaintext financial fields
 * using AES-256-GCM. Idempotent — skips already-encrypted records.
 *
 * Usage: ENCRYPTION_KEY=xxx npx ts-node -r tsconfig-paths/register src/scripts/encrypt-existing-data.ts
 */

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  console.error('❌ ENCRYPTION_KEY environment variable is required');
  process.exit(1);
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY = Buffer.from(ENCRYPTION_KEY, 'hex');

function encrypt(value: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `enc:v1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function isEncrypted(value: string | null): boolean {
  if (!value) return false;
  return value.startsWith('enc:v1:');
}

const prisma = new PrismaClient();

interface MigrateConfig {
  model: string;
  pk: string;
  fields: string[];
  softDelete?: boolean;
}

const MODELS: MigrateConfig[] = [
  { model: 'transaction', pk: 'id', fields: ['amount'], softDelete: true },
  { model: 'account', pk: 'id', fields: ['balance'], softDelete: true },
  { model: 'creditCard', pk: 'id', fields: ['limit'], softDelete: true },
  {
    model: 'creditCardInvoice',
    pk: 'id',
    fields: ['totalAmount', 'paidAmount'],
    softDelete: false,
  },
  {
    model: 'creditCardInstallment',
    pk: 'id',
    fields: ['totalAmount', 'amountPerMonth', 'entryAmount'],
    softDelete: false,
  },
  { model: 'budget', pk: 'id', fields: ['amount'], softDelete: true },
  {
    model: 'goal',
    pk: 'id',
    fields: ['targetAmount', 'currentAmount'],
    softDelete: true,
  },
  {
    model: 'recurringTransaction',
    pk: 'id',
    fields: ['amount'],
    softDelete: false,
  },
];

async function migrateModel(cfg: MigrateConfig) {
  const model: any = (prisma as any)[cfg.model];
  if (!model) {
    console.error(`❌ Model ${cfg.model} not found`);
    return;
  }

  const select: Record<string, boolean> = { [cfg.pk]: true };
  for (const f of cfg.fields) select[f] = true;

  const where = cfg.softDelete ? { deletedAt: null } : {};
  const records = await model.findMany({ where, select });

  let encrypted = 0;
  let skipped = 0;

  for (const record of records) {
    const updates: Record<string, string> = {};
    let needsUpdate = false;

    for (const field of cfg.fields) {
      const value = record[field];
      if (
        value !== null &&
        value !== undefined &&
        !isEncrypted(String(value))
      ) {
        updates[field] = encrypt(String(value));
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await model.update({
        where: { [cfg.pk]: record[cfg.pk] },
        data: updates,
      });
      encrypted++;
    } else {
      skipped++;
    }
  }

  console.log(`✅ ${cfg.model}: ${encrypted} encrypted, ${skipped} skipped`);
}

async function main() {
  console.log('🔐 Starting data encryption migration...\n');
  try {
    for (const cfg of MODELS) {
      await migrateModel(cfg);
    }
    console.log('\n🎉 Data encryption migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
