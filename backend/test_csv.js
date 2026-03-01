const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function simularImportacao() {
    console.log("=== INICIO DO ROTINA DE TESTE ===");
    const csvPath = process.argv[2] || '../Extrato conta corrente - 022026.csv';

    if (!fs.existsSync(csvPath)) {
        console.error(`Arquivo não encontrado: ${csvPath}`);
        return;
    }

    console.log(`Lendo arquivo: ${csvPath}`);
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n');

    const parsed = [];
    let isHeader = true;

    console.log(`Parseando ${lines.length} linhas...`);

    for (const line of lines) {
        if (!line.trim()) continue;
        if (isHeader) { isHeader = false; continue; }

        let cols = line.split('","').map(c => c.replace(/^"|"$/g, ''));
        if (cols.length < 5) cols = line.split(';').map(c => c.replace(/^"|"$/g, ''));

        if (cols.length >= 4) {
            const dateStr = cols[0];
            const desc1 = cols[1] || '';
            const desc2 = cols[2] || '';
            const typeStr = cols[5] || '';

            let valStr = cols[4] || cols[3];
            if (!dateStr || !valStr) continue;

            let date = dateStr;
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) date = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }

            const rawVal = valStr.replace(/\./g, '').replace(',', '.');
            const amount = parseFloat(rawVal);
            if (isNaN(amount) || desc1.includes('Saldo Anterior')) continue; // ignora saldo anterior

            const type = amount >= 0 || typeStr.toLowerCase() === 'entrada' ? 'INCOME' : 'EXPENSE';
            const finalDesc = desc2 && desc2.length > 3 ? desc2 : desc1;

            const d = new Date(`${date}T12:00:00Z`);
            if (isNaN(d.getTime())) {
                console.log(`[AVISO] Linha ignorada devida a Data Inválida: ${dateStr}`);
                continue;
            }

            parsed.push({
                date: d,
                description: finalDesc,
                amount: Math.abs(amount),
                type
            });
        }
    }

    console.log(`Lidos do CSV: ${parsed.length} lançamentos válidos.`);
    if (parsed.length === 0) return;

    console.log(`Buscando usuario no banco...`);
    const user = await prisma.user.findFirst();
    if (!user) {
        console.error('Nenhum usuário encontrado no banco.');
        return;
    }

    const minDate = new Date(Math.min(...parsed.map(t => t.date.getTime())));
    const maxDate = new Date(Math.max(...parsed.map(t => t.date.getTime())));

    console.log(`Buscando DB Transactions de ${minDate.toISOString()} ate ${maxDate.toISOString()}`);

    const dbTransactions = await prisma.transaction.findMany({
        where: {
            userId: user.id,
            date: { gte: minDate, lte: maxDate }
        },
        select: { date: true, amount: true, description: true }
    });

    const existingSet = new Set(
        dbTransactions.map(t => `${t.date.toISOString().split('T')[0]}_${t.amount}_${t.description.trim().toLowerCase()}`)
    );

    let ignoredCount = 0;
    let newCount = 0;

    console.log(`\n--- DETALHAMENTO DA ANALISE ---`);

    for (const t of parsed) {
        const hash = `${t.date.toISOString().split('T')[0]}_${t.amount}_${t.description.trim().toLowerCase()}`;
        const dateStr = t.date.toISOString().split('T')[0];

        const sameDateAndValue = dbTransactions.filter(dbT =>
            dbT.date.toISOString().split('T')[0] === dateStr && dbT.amount === t.amount
        );

        if (existingSet.has(hash)) {
            console.log(`[IGNORADA - IDÊNTICA] ${dateStr} - R$ ${t.amount} >> "${t.description}"`);
            ignoredCount++;
        } else if (sameDateAndValue.length > 0) {
            console.log(`[ATENÇÃO - NOME DIFERENTE] ${dateStr} - R$ ${t.amount} >> CSV: "${t.description}" | DB: "${sameDateAndValue[0].description}"`);
            newCount++;
        } else {
            console.log(`[PASSOU - NOVA]       ${dateStr} - R$ ${t.amount} >> "${t.description}"`);
            newCount++;
        }
    }

    console.log(`\n=== RESUMO DA SIMULAÇÃO ===`);
    console.log(`Total CSV: ${parsed.length}`);
    console.log(`Ignoradas (Já cadastradas IDÊNTICAS): ${ignoredCount}`);
    console.log(`Novas inserções geradas (ou Conflitos de Nome): ${newCount}`);
}

simularImportacao()
    .catch(console.error)
    .finally(() => {
        console.log("=== FINALIZANDO CONEXAO PRISMA ===");
        prisma.$disconnect();
    });
