const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const userId = 'f6f11c5b-b40a-46e1-83f2-85cd30b02c13'; // Selmo

    // Receitas de fevereiro 2026
    const incomes = await prisma.transaction.findMany({
        where: {
            userId,
            type: 'INCOME',
            date: {
                gte: new Date('2026-02-01'),
                lte: new Date('2026-02-28')
            }
        },
        orderBy: { amount: 'desc' },
        select: { id: true, date: true, description: true, amount: true, categoryLegacy: true }
    });

    console.log(`\n=== RECEITAS FEVEREIRO 2026 (${incomes.length} transações) ===\n`);
    let total = 0;
    incomes.forEach(t => {
        total += t.amount;
        const data = new Date(t.date).toLocaleDateString('pt-BR');
        console.log(`[${data}] R$ ${t.amount.toFixed(2)} | ${t.description.substring(0, 60)} | ${t.categoryLegacy || 'sem cat'}`);
    });
    console.log(`\nTOTAL: R$ ${total.toFixed(2)}`);
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
