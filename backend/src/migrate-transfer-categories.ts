/**
 * Migration Script: Fix Transfer Categories
 * 
 * Problem: 'Transferência Recebida' was incorrectly seeded as type: 'INCOME'
 * instead of type: 'TRANSFER'. This caused transfer transactions to be counted
 * as legitimate income on the dashboard, inflating the balance.
 * 
 * This script:
 * 1. Updates all categories with transfer-related names to type: 'TRANSFER'
 * 2. Deduplicates transfer categories per user (keeps the oldest, removes duplicates)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TRANSFER_NAMES = [
  'Transferência',
  'Transferencia',
  'Transferência Recebida',
  'Transferencia Recebida',
];

async function main() {
  console.log('--- INICIANDO MIGRAÇÃO DE CATEGORIAS DE TRANSFERÊNCIA ---\n');

  // 1. Update all transfer-related categories to type: 'TRANSFER'
  const updateResult = await prisma.category.updateMany({
    where: {
      name: {
        in: TRANSFER_NAMES,
        mode: 'insensitive',
      },
      NOT: {
        type: 'TRANSFER',
      },
    },
    data: {
      type: 'TRANSFER',
    },
  });

  console.log(`Categorias atualizadas para type: 'TRANSFER': ${updateResult.count}`);

  // 2. Find and deduplicate transfer categories per user
  const allTransferCategories = await prisma.category.findMany({
    where: {
      type: 'TRANSFER',
    },
    orderBy: { createdAt: 'asc' },
  });

  const userTransferCats = new Map<string, typeof allTransferCategories>();
  for (const cat of allTransferCategories) {
    if (!userTransferCats.has(cat.userId)) {
      userTransferCats.set(cat.userId, []);
    }
    userTransferCats.get(cat.userId)!.push(cat);
  }

  let duplicateCount = 0;
  for (const [userId, cats] of userTransferCats) {
    if (cats.length > 1) {
      // Keep the oldest (canonical), delete the rest
      const [canonical, ...duplicates] = cats;
      console.log(`\nUsuário ${userId}: mantendo "${canonical.name}", removendo ${duplicates.length} duplicata(s)`);
      
      for (const dup of duplicates) {
        // Reassign transactions from duplicate to canonical category
        await prisma.transaction.updateMany({
          where: { categoryId: dup.id },
          data: { categoryId: canonical.id },
        });
        
        await prisma.category.delete({
          where: { id: dup.id },
        });
        
        duplicateCount++;
        console.log(`  - Removida duplicata: "${dup.name}"`);
      }
    }
  }

  console.log(`\nDuplicatas removidas: ${duplicateCount}`);

  // 3. Verify final state
  const finalTransferCats = await prisma.category.findMany({
    where: { type: 'TRANSFER' },
    select: { id: true, name: true, type: true, userId: true },
  });

  console.log(`\n--- ESTADO FINAL ---`);
  console.log(`Total de categorias TRANSFER: ${finalTransferCats.length}`);
  
  const uniqueUsers = new Set(finalTransferCats.map(c => c.userId));
  console.log(`Usuários com categoria TRANSFER: ${uniqueUsers.size}`);

  console.log('\n--- MIGRAÇÃO CONCLUÍDA ---');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
