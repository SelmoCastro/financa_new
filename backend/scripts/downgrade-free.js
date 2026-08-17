const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function downgrade() {
  const email = process.env.TARGET_EMAIL;
  if (!email) throw new Error('TARGET_EMAIL is required');

  const user = await prisma.user.findUnique({
    where: { email },
    include: { subscription: true },
  });

  if (!user) {
    console.log('Usuario nao encontrado');
    process.exit(1);
  }

  console.log('Usuario:', user.name);
  console.log('Subscription atual:', user.subscription?.plan || 'nenhuma');
  console.log('Status:', user.subscription?.status || 'nenhum');

  if (user.subscription) {
    await prisma.subscription.delete({
      where: { userId: user.id },
    });
    console.log('Subscription deletada - usuario agora e FREE tier');
  } else {
    console.log('Usuario ja esta sem subscription (FREE)');
  }

  const accounts = await prisma.account.count({ where: { userId: user.id } });
  const cards = await prisma.card.count({ where: { userId: user.id } });
  const budgets = await prisma.budget.count({ where: { userId: user.id } });
  const goals = await prisma.goal.count({ where: { userId: user.id } });

  console.log('\nRecursos atuais:');
  console.log('  Contas:', accounts);
  console.log('  Cartoes:', cards);
  console.log('  Budgets:', budgets);
  console.log('  Goals:', goals);
  console.log('\nLimites Free: 1 AI/d, 1 conta, 1 cartao, 3 budgets, 3 goals');

  await prisma.$disconnect();
}

downgrade().catch((e) => {
  console.error(e);
  process.exit(1);
});
