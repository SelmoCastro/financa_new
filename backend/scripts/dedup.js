const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Buscando transações duplicadas...');

    const txs = await prisma.transaction.findMany({
        orderBy: { createdAt: 'asc' },
        select: { id: true, date: true, amount: true, description: true, userId: true, createdAt: true }
    });

    console.log(`Total de transações no banco: ${txs.length}`);

    // Agrupar por userId + data + valor + descrição
    const hashMap = new Map();
    txs.forEach(t => {
        const hash = `${t.userId}_${t.date.toISOString().split('T')[0]}_${t.amount}_${t.description.trim().toLowerCase()}`;
        if (!hashMap.has(hash)) hashMap.set(hash, []);
        hashMap.get(hash).push({ id: t.id, createdAt: t.createdAt });
    });

    // Coletar IDs duplicados (manter o mais antigo - createdAt menor)
    const idsToDelete = [];
    hashMap.forEach((records) => {
        if (records.length > 1) {
            // Ordenar por createdAt: manter o primeiro (mais antigo)
            records.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            const toRemove = records.slice(1); // todos exceto o primeiro
            toRemove.forEach(r => idsToDelete.push(r.id));
        }
    });

    console.log(`\n⚠️  Encontradas ${idsToDelete.length} transações duplicadas.`);

    if (idsToDelete.length === 0) {
        console.log('✅ Nenhuma duplicata encontrada!');
        return;
    }

    // Só mostra a listagem, perguntar ao usuário antes de deletar
    console.log('\nIDs que serão removidos (duplicatas):');
    console.log(idsToDelete.join('\n'));

    // Deletar as duplicatas
    const result = await prisma.transaction.deleteMany({
        where: { id: { in: idsToDelete } }
    });

    console.log(`\n✅ ${result.count} transações duplicadas removidas com sucesso!`);
}

main()
    .catch((e) => {
        console.error('Erro:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
