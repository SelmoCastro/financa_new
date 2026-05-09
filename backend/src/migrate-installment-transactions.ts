/**
 * Migração: Gerar transações mensais para parcelamentos existentes
 * que foram criados ANTES da correção que faz createInstallment gerar transactions.
 * 
 * Rodar UMA VEZ na VPS: cd backend && npx ts-node src/migrate-installment-transactions.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Buscando parcelamentos ativos sem transações associadas...');

  const installments = await prisma.creditCardInstallment.findMany({
    where: { isActive: true },
    include: { creditCard: true },
  });

  console.log(`📋 Encontrados ${installments.length} parcelamentos ativos`);

  let created = 0;
  let skipped = 0;

  for (const inst of installments) {
    const entryAmount = inst.entryAmount ? Number(inst.entryAmount) : 0;
    const totalAmount = Number(inst.totalAmount);
    const installmentCount = inst.installmentCount;

    // Verificar se já existem transações para este parcelamento
    const existingTransactions = await prisma.transaction.findMany({
      where: {
        userId: inst.userId,
        creditCardId: inst.creditCardId,
        description: { startsWith: inst.description },
        installmentCount: inst.installmentCount,
        type: 'EXPENSE',
        deletedAt: null,
      },
    });

    if (existingTransactions.length >= installmentCount) {
      console.log(`  ⏭️  "${inst.description}" já tem ${existingTransactions.length} transações — pulando`);
      skipped++;
      continue;
    }

    // Remover transações parciais se houver
    if (existingTransactions.length > 0) {
      console.log(`  🗑️  Removendo ${existingTransactions.length} transações parciais para "${inst.description}"`);
      await prisma.transaction.deleteMany({
        where: { id: { in: existingTransactions.map(t => t.id) } },
      });
    }

    // Calcular amountPerMonth
    let amountPerMonth: number;
    if (entryAmount > 0 && installmentCount > 1) {
      amountPerMonth = Math.round(((totalAmount - entryAmount) / (installmentCount - 1)) * 100) / 100;
    } else {
      amountPerMonth = Math.round((totalAmount / installmentCount) * 100) / 100;
    }

    // Gerar transações
    const startDate = new Date(inst.startDate);
    const transactionData: any[] = [];

    for (let i = 1; i <= installmentCount; i++) {
      const monthOffset = i - 1;
      const dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + monthOffset, inst.dueDay);
      const expectedMonth = (startDate.getMonth() + monthOffset) % 12;
      if (dueDate.getMonth() !== expectedMonth) {
        dueDate.setDate(0);
      }

      const amount = (entryAmount > 0 && i === 1) ? entryAmount : amountPerMonth;

      transactionData.push({
        description: `${inst.description}${installmentCount > 1 ? ` (${i}/${installmentCount})` : ''}`,
        amount,
        date: dueDate,
        type: 'EXPENSE',
        creditCardId: inst.creditCardId,
        userId: inst.userId,
        categoryId: inst.categoryId || null,
        accountId: inst.accountId || null,
        currentInstallment: i,
        installmentCount,
      });
    }

    await prisma.transaction.createMany({ data: transactionData });
    console.log(`  ✅ Criadas ${installmentCount} transações para "${inst.description}" (${inst.creditCard?.name || inst.creditCardId})`);
    created++;
  }

  console.log(`\n✨ Migração concluída: ${created} parcelamentos migrados, ${skipped} pulados`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());