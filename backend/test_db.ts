import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findFirst();
  if(!user) return console.log("No user");
  
  // Test month 0 (January)
  let m = 0; let y = 2026;
  let start = new Date(y, m, 1);
  let end = new Date(y, m + 1, 0, 23, 59, 59, 999);
  
  let txs = await prisma.transaction.aggregate({
     _sum: { amount: true },
     where: { userId: user.id, date: { gte: start, lte: end } }
  });
  console.log("Jan 2026 sum:", txs._sum.amount);

  // Test month 1 (February)
  m = 1;
  start = new Date(y, m, 1);
  end = new Date(y, m + 1, 0, 23, 59, 59, 999);
  txs = await prisma.transaction.aggregate({
     _sum: { amount: true },
     where: { userId: user.id, date: { gte: start, lte: end } }
  });
  console.log("Feb 2026 sum:", txs._sum.amount);
}
run().finally(() => prisma.$disconnect());
