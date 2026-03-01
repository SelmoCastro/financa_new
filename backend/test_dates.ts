import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    const txs = await prisma.transaction.findMany({
        orderBy: { date: 'desc' },
        take: 5
    });
    console.log(txs.map(t => ({ id: t.id, desc: t.description, date: t.date, amount: t.amount })));
}
run().finally(() => prisma.$disconnect());
