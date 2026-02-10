import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('Iniciando backup dos dados...');

    const users = await prisma.user.findMany();
    const transactions = await prisma.transaction.findMany();
    const budgets = await prisma.budget.findMany();
    const goals = await prisma.goal.findMany();

    const backup = {
        timestamp: new Date().toISOString(),
        data: {
            users,
            transactions,
            budgets,
            goals
        }
    };

    const backupPath = path.join(__dirname, `backup_${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

    console.log(`Backup salvo com sucesso em: ${backupPath}`);
    console.log(`Registros salvos:`);
    console.log(`- Users: ${users.length}`);
    console.log(`- Transactions: ${transactions.length}`);
    console.log(`- Budgets: ${budgets.length}`);
    console.log(`- Goals: ${goals.length}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
