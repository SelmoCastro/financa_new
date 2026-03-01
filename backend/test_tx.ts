import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const tx = await prisma.transaction.findUnique({
    where: { id: '5fa0961e-b821-4100-8a82-bbfc67f0156b' }
  });
  console.log(tx);
}
run().finally(() => prisma.$disconnect());
