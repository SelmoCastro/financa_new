import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.count();
    const txs = await prisma.transaction.count();
    const accounts = await prisma.account.count();
    const cards = await prisma.creditCard.count();
    const categories = await prisma.category.count();

    console.log(`--- RELATÓRIO DO BANCO NEON ---`);
    console.log(`Users: ${users}`);
    console.log(`Transactions: ${txs}`);
    console.log(`Accounts: ${accounts}`);
    console.log(`CreditCards: ${cards}`);
    console.log(`Categories: ${categories}`);
    console.log(`-------------------------------`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
