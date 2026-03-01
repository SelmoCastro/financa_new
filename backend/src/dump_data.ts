import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const startDate = new Date('2026-02-12T00:00:00Z');

    const transactions = await prisma.transaction.findMany({
        where: {
            date: {
                gte: startDate,
            },
        },
        orderBy: {
            date: 'asc',
        },
    });

    const output = {
        count: transactions.length,
        transactions: transactions.map(t => ({
            id: t.id,
            description: t.description,
            amount: t.amount,
            date: t.date,
            type: t.type,
            categoryId: t.categoryId,
            categoryLegacy: t.categoryLegacy,
        })),
    };

    fs.writeFileSync('transactions_dump.json', JSON.stringify(output, null, 2));
    console.log(`Dumped ${transactions.length} transactions to transactions_dump.json`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
