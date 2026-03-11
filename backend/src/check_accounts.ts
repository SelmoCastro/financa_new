
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- ANÁLISE DE SALDOS POR CONTA ---');
  
  const accounts = await prisma.account.findMany();
  
  for (const account of accounts) {
    // 1. Saldo registrado na tabela Account
    const registeredBalance = account.balance;
    
    // 2. Calcular saldo real baseado em todas as transações desta conta
    const transactions = await prisma.transaction.findMany({
      where: { accountId: account.id }
    });
    
    const income = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((acc, t) => acc + t.amount, 0);
      
    const expense = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc, t) => acc + t.amount, 0);
      
    const calculatedBalance = income - expense;

    console.log(`\nConta: ${account.name} (ID: ${account.id})`);
    console.log(`Saldo Registrado: R$ ${registeredBalance.toFixed(2)}`);
    console.log(`Saldo Calculado (Transações): R$ ${calculatedBalance.toFixed(2)}`);
    console.log(`Diferença: R$ ${(registeredBalance - calculatedBalance).toFixed(2)}`);
    
    if (transactions.length > 0) {
        console.log('Últimas 5 transações desta conta:');
        transactions.sort((a,b) => b.date.getTime() - a.date.getTime()).slice(0, 5).forEach(t => {
            console.log(`- [${t.date.toISOString().slice(0,10)}] ${t.description}: R$ ${t.amount.toFixed(2)} (${t.type})`);
        });
    } else {
        console.log('Sem transações vinculadas a esta conta.');
    }
  }

  // Verificar transações sem conta vinculada
  const orphanTransactions = await prisma.transaction.findMany({
    where: { accountId: null }
  });
  
  if (orphanTransactions.length > 0) {
      console.log(`\n--- TRANSAÇÕES SEM CONTA (ÓRFÃS): ${orphanTransactions.length} ---`);
      const orphanIncome = orphanTransactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
      const orphanExpense = orphanTransactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
      console.log(`Impacto no Geral: R$ ${(orphanIncome - orphanExpense).toFixed(2)}`);
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
