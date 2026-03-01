const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // IDs das transações duplicadas que vieram do CSV e devem ser removidas
    // Mantemos os lançamentos manuais (mais antigos, desc mais simples)
    // Removemos os duplicados do CSV (desc longos do BB)
    const idsToDelete = [
        // R$1702.32 duplicado: CSV "Proventos TED" (o manual "Salario" 05/02 fica)
        // Buscar pelo description e data exatos
    ];

    // Buscar e exibir os candidatos para deletar
    const csvDups = await prisma.transaction.findMany({
        where: {
            userId: 'f6f11c5b-b40a-46e1-83f2-85cd30b02c13',
            type: 'INCOME',
            date: { gte: new Date('2026-02-01'), lte: new Date('2026-02-28') },
            OR: [
                // Salário duplicado do CSV
                { description: { contains: 'Proventos TED' }, amount: 1702.32 },
                // PIX Nair do CSV (há lançamento manual "Pix Nair")
                { description: { contains: 'NAIR CASTRO' }, amount: 75.00 },
                // PIX Emanoelle do CSV (há lançamento manual "Pix Emanuela")
                { description: { contains: 'Emanoelle' }, amount: 5.00 },
                // PIX de Selmo para si mesmo (provavelmente transferência interna)
                { description: { contains: 'SELMO CASTR' }, amount: 58.00 },
            ]
        },
        select: { id: true, date: true, description: true, amount: true }
    });

    console.log('\n=== Transações a serem removidas ===');
    csvDups.forEach(t => {
        console.log(`ID: ${t.id} | ${new Date(t.date).toLocaleDateString('pt-BR')} | R$ ${t.amount} | ${t.description.substring(0, 60)}`);
    });

    if (csvDups.length === 0) {
        console.log('Nenhuma encontrada.');
        return;
    }

    const result = await prisma.transaction.deleteMany({
        where: { id: { in: csvDups.map(t => t.id) } }
    });

    console.log(`\n✅ ${result.count} transações removidas com sucesso!`);

    // Verificar novo total de INCOME
    const remaining = await prisma.transaction.aggregate({
        where: {
            userId: 'f6f11c5b-b40a-46e1-83f2-85cd30b02c13',
            type: 'INCOME',
            date: { gte: new Date('2026-02-01'), lte: new Date('2026-02-28') }
        },
        _sum: { amount: true }
    });
    console.log(`\nNovo total de Entradas em fevereiro: R$ ${remaining._sum.amount?.toFixed(2)}`);
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
