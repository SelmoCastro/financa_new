import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debug() {
    console.log('--- Database Debug ---');

    const users = await prisma.user.findMany({ select: { id: true, email: true, name: true } });
    console.log('Users found:', users.length);
    users.forEach(u => console.log(`- ${u.name} (${u.email}): ${u.id}`));

    for (const user of users) {
        console.log(`\nChecking data for user: ${user.name} (${user.email}) [${user.id}]`);

        const accounts = await prisma.account.count({ where: { userId: user.id } });
        console.log('Accounts:', accounts);

        const transactions = await prisma.transaction.count({ where: { userId: user.id } });
        console.log('Transactions:', transactions);

        const categories = await prisma.category.count({ where: { userId: user.id } });
        console.log('Categories:', categories);

        if (transactions > 0) {
            const lastTxs = await prisma.transaction.findMany({
                where: { userId: user.id },
                take: 1,
                orderBy: { createdAt: 'desc' },
                include: { category: true }
            });
            console.log('Last transaction:', JSON.stringify(lastTxs, null, 2));
        }
    }
}

debug()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
