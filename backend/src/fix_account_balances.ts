
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- REPARANDO SALDOS DE CONTAS ---');
  
  // 1. Remover a conta "Tatu" que tem o valor corrompido e nenhuma transação
  const tatu = await prisma.account.deleteMany({
    where: { name: 'Tatu', balance: { lt: -1000000 } }
  });
  console.log(`Contas corrompidas removidas: ${tatu.count}`);

  // 2. Sincronizar saldos de todas as contas
  const accounts = await prisma.account.findMany();
  
  for (const account of accounts) {
    const transactions = await prisma.transaction.findMany({
      where: { accountId: account.id }
    });
    
    const income = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((acc, t) => acc + t.amount, 0);
      
    const expense = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc, t) => acc + t.amount, 0);
      
    const realBalance = income - expense;

    console.log(`Sincronizando ${account.name}: R$ ${account.balance.toFixed(2)} -> R$ ${realBalance.toFixed(2)}`);
    
    await prisma.account.update({
      where: { id: account.id },
      data: { balance: realBalance }
    });
  }

  console.log('\n--- REPARO CONCLUÍDO ---');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
