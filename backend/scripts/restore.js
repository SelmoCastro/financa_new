const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const SELMO_ID = 'f6f11c5b-b40a-46e1-83f2-85cd30b02c13';

async function main() {
    const backupFile = path.join(__dirname, '..', 'backups', 'backup_financa_2026-02-20T23-46-07-895Z.json');

    console.log(`📂 Lendo backup: ${backupFile}`);
    const backup = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));

    // Filtrar apenas dados do Selmo
    const myAccounts = backup.accounts.filter(a => a.userId === SELMO_ID);
    const myCreditCards = backup.creditCards.filter(c => c.userId === SELMO_ID);
    const myCategories = backup.categories.filter(c => c.userId === SELMO_ID);
    const myTransactions = backup.transactions.filter(t => t.userId === SELMO_ID);
    const myBudgets = backup.budgets.filter(b => b.userId === SELMO_ID);
    const myGoals = backup.goals.filter(g => g.userId === SELMO_ID);

    console.log(`\n📊 Dados do Selmo no backup:`);
    console.log(`  - Contas: ${myAccounts.length}`);
    console.log(`  - Cartões: ${myCreditCards.length}`);
    console.log(`  - Categorias: ${myCategories.length}`);
    console.log(`  - Transações: ${myTransactions.length}`);
    console.log(`  - Orçamentos: ${myBudgets.length}`);
    console.log(`  - Metas: ${myGoals.length}`);

    console.log(`\n🗑️  Deletando dados atuais do Selmo...`);
    await prisma.transaction.deleteMany({ where: { userId: SELMO_ID } });
    await prisma.creditCard.deleteMany({ where: { userId: SELMO_ID } });
    await prisma.category.deleteMany({ where: { userId: SELMO_ID } });
    await prisma.account.deleteMany({ where: { userId: SELMO_ID } });
    await prisma.budget.deleteMany({ where: { userId: SELMO_ID } });
    await prisma.goal.deleteMany({ where: { userId: SELMO_ID } });
    console.log('✅ Dados atuais deletados!');

    console.log('\n🔄 Restaurando dados do backup...');

    if (myAccounts.length > 0) {
        await prisma.account.createMany({
            data: myAccounts.map(a => ({ ...a, createdAt: new Date(a.createdAt), updatedAt: new Date(a.updatedAt) })),
            skipDuplicates: true
        });
        console.log(`  ✅ ${myAccounts.length} contas restauradas`);
    }

    if (myCreditCards.length > 0) {
        await prisma.creditCard.createMany({
            data: myCreditCards.map(c => ({ ...c, createdAt: new Date(c.createdAt), updatedAt: new Date(c.updatedAt) })),
            skipDuplicates: true
        });
        console.log(`  ✅ ${myCreditCards.length} cartões restaurados`);
    }

    if (myCategories.length > 0) {
        await prisma.category.createMany({
            data: myCategories.map(c => ({ ...c, createdAt: new Date(c.createdAt), updatedAt: new Date(c.updatedAt) })),
            skipDuplicates: true
        });
        console.log(`  ✅ ${myCategories.length} categorias restauradas`);
    }

    if (myTransactions.length > 0) {
        await prisma.transaction.createMany({
            data: myTransactions.map(t => ({
                ...t,
                date: new Date(t.date),
                createdAt: new Date(t.createdAt),
                updatedAt: new Date(t.updatedAt)
            })),
            skipDuplicates: true
        });
        console.log(`  ✅ ${myTransactions.length} transações restauradas`);
    }

    if (myBudgets.length > 0) {
        await prisma.budget.createMany({
            data: myBudgets.map(b => ({ ...b, createdAt: new Date(b.createdAt), updatedAt: new Date(b.updatedAt) })),
            skipDuplicates: true
        });
        console.log(`  ✅ ${myBudgets.length} orçamentos restaurados`);
    }

    if (myGoals.length > 0) {
        await prisma.goal.createMany({
            data: myGoals.map(g => ({ ...g, deadline: g.deadline ? new Date(g.deadline) : null, createdAt: new Date(g.createdAt), updatedAt: new Date(g.updatedAt) })),
            skipDuplicates: true
        });
        console.log(`  ✅ ${myGoals.length} metas restauradas`);
    }

    console.log('\n🎉 Banco de dados restaurado com sucesso!');
}

main()
    .catch(e => { console.error('❌ Erro no restore:', e.message); process.exit(1); })
    .finally(() => prisma.$disconnect());
