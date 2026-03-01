import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const txs = await prisma.transaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, description: true, amount: true, fitId: true, date: true }
  });
  console.log("LAST 10 TRANSACTIONS IN PRISMA:");
  console.dir(txs, { depth: null });
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
