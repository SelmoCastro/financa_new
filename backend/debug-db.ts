import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debug() {
    console.log('--- Database Debug ---');

    const users = await prisma.user.findMany({ select: { id: true, email: true, name: true } });
    console.log('Users found:', users.length);
    users.forEach(u => console.log(`- ${u.name} (${u.email}): ${u.id}`));

    if (users.length > 0) {
        const userId = users[0].id;
        console.log(`\nChecking data for first user (${users[0].name}):`);

        const accounts = await prisma.account.count({ where: { userId } });
        console.log('Accounts:', accounts);

        const transactions = await prisma.transaction.count({ where: { userId } });
        console.log('Transactions:', transactions);

        const categories = await prisma.category.count({ where: { userId } });
        console.log('Categories:', categories);

        const lastTxs = await prisma.transaction.findMany({
            where: { userId },
            take: 2,
            orderBy: { createdAt: 'desc' },
            include: { category: true }
        });
        console.log('Last 2 transactions:', JSON.stringify(lastTxs, null, 2));
    }
}

debug()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
