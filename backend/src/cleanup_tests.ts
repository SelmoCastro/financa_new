
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- INICIANDO LIMPEZA DE TRANSAÇÕES DE TESTE ---');
  
  // 1. Identificar transações com descrições de teste ou valores absurdos
  const tests = await prisma.transaction.findMany({
    where: {
      OR: [
        { description: { contains: 'test', mode: 'insensitive' } },
        { description: { contains: 'Russjajajj', mode: 'insensitive' } },
        { description: { contains: 't1t1', mode: 'insensitive' } },
        { amount: { gt: 1000000000 } } // Qualquer valor acima de 1 bilhão (preventivo)
      ]
    }
  });

  console.log(`Encontradas ${tests.length} transações para remover.`);

  for (const t of tests) {
    console.log(`REMOVENDO: [${t.date.toISOString().slice(0, 10)}] ${t.description}: R$ ${t.amount}`);
    await prisma.transaction.delete({
      where: { id: t.id }
    });
  }

  console.log('\n--- LIMPEZA CONCLUÍDA ---');
  
  // Verificar novo saldo sumário
  const startOfMonth = new Date('2026-03-01T00:00:00Z');
  const endOfMonth = new Date('2026-04-01T00:00:00Z');
  
  const remaining = await prisma.transaction.findMany({
    where: {
      date: { gte: startOfMonth, lt: endOfMonth }
    }
  });

  const income = remaining.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
  const expense = remaining.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);

  console.log(`Novo Resumo Março/2026:`);
  console.log(`Ganhos: R$ ${income.toFixed(2)}`);
  console.log(`Gastos: R$ ${expense.toFixed(2)}`);
  console.log(`Saldo Real: R$ ${(income - expense).toFixed(2)}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
