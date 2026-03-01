import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('Iniciando backup do banco de dados...');

    const data = {
        users: await prisma.user.findMany(),
        accounts: await prisma.account.findMany(),
        creditCards: await prisma.creditCard.findMany(),
        categories: await prisma.category.findMany(),
        transactions: await prisma.transaction.findMany(),
        budgets: await prisma.budget.findMany(),
        goals: await prisma.goal.findMany(),
    };

    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup_financa_${timestamp}.json`);

    fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));

    console.log(`✅ Backup concluído com sucesso! Salvo em: ${backupFile}`);
}

main()
    .catch((e) => {
        console.error('Erro ao realizar o backup:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
