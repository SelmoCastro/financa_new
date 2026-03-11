
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const startOfMonth = new Date('2026-03-01T00:00:00Z');
  const endOfMonth = new Date('2026-04-01T00:00:00Z');

  console.log('--- BUSCANDO TRANSAÇÕES DE MARÇO/2026 ---');
  
  const transactions = await prisma.transaction.findMany({
    where: {
      date: {
        gte: startOfMonth,
        lt: endOfMonth,
      },
    },
    orderBy: {
      date: 'desc',
    },
  });

  console.log(`Total encontrado: ${transactions.length}`);
  
  const income = transactions
    .filter(t => t.type === 'INCOME')
    .reduce((acc, t) => acc + t.amount, 0);
    
  const expense = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((acc, t) => acc + t.amount, 0);

  console.log(`Renda do mês: R$ ${income.toFixed(2)}`);
  console.log(`Despesa do mês: R$ ${expense.toFixed(2)}`);
  console.log(`Saldo Real do mês: R$ ${(income - expense).toFixed(2)}`);

  console.log('\n--- DETALHES ---');
  transactions.forEach(t => {
    console.log(`[${t.date.toISOString().slice(0, 10)}] ${t.type === 'INCOME' ? '(+)' : '(-)'} ${t.description}: R$ ${t.amount.toFixed(2)} ${t.isFixed ? '[FIXO]' : ''}`);
  });

  // Buscar fixos que NÃO estão no mês
  console.log('\n--- BUSCANDO GASTOS FIXOS PENDENTES ---');
  const allFixed = await prisma.transaction.findMany({
    where: { isFixed: true },
    distinct: ['description'],
    orderBy: { date: 'desc' }
  });

  for (const fixed of allFixed) {
    const existsThisMonth = transactions.some(t => t.description.toLowerCase().trim() === fixed.description.toLowerCase().trim());
    if (!existsThisMonth) {
        console.log(`PENDENTE: ${fixed.description} (Previsto: R$ ${fixed.amount.toFixed(2)})`);
    }
  }

}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
