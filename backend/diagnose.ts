
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- DIAGNÓSTICO DE DADOS ---');
  const users = await prisma.user.findMany();
  console.log('Usuários encontrados:', users.length);

  for (const user of users) {
    const txCount = await prisma.transaction.count({
      where: { userId: user.id }
    });
    const categoriesCount = await prisma.category.count({
      where: { userId: user.id }
    });
    const accounts = await prisma.account.findMany({
      where: { userId: user.id }
    });
    
    console.log(`\nEmail: ${user.email}`);
    console.log(`ID: ${user.id}`);
    console.log(`Transações: ${txCount}`);
    console.log(`Categorias: ${categoriesCount}`);
    console.log(`Contas: ${accounts.length}`);
    accounts.forEach(acc => {
      console.log(` - Conta: ${acc.name}, Saldo: ${acc.balance}`);
    });

    if (txCount > 0) {
      const lastTx = await prisma.transaction.findFirst({
        where: { userId: user.id },
        orderBy: { date: 'desc' },
        include: { category: true }
      });
      console.log(`Última transação: ${lastTx?.date.toISOString()} - ${lastTx?.description} (${lastTx?.amount})`);
    }
  }
}

main()
  .catch(e => {
    console.error('ERRO NO DIAGNÓSTICO:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
