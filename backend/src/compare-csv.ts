import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as readline from 'readline';

const prisma = new PrismaClient();

async function parseCSV(filePath: string) {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const parsed: any[] = [];
    let isHeader = true;

    for await (const line of rl) {
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

            parsed.push({
                date: new Date(`${date}T12:00:00Z`),
                description: finalDesc,
                amount: Math.abs(amount),
                type
            });
        }
    }
    return parsed;
}

async function simularImportacao() {
    const args = process.argv.slice(2);
    const csvPath = args[0] || '../../Extrato conta corrente - 022026.csv';

    if (!fs.existsSync(csvPath)) {
        console.error(`Arquivo não encontrado: ${csvPath}`);
        return;
    }

    // Pegar primeiro usuario e sua conta
    const user = await prisma.user.findFirst();
    if (!user) {
        console.error('Nenhum usuário encontrado no banco.');
        return;
    }
    const account = await prisma.account.findFirst({ where: { userId: user.id } });

    console.log(`\n=== INICIANDO SIMULAÇÃO DE IMPORTAÇÃO ===`);
    console.log(`Usuário: ${user.name || user.email}`);
    console.log(`Conta alvo: ${account?.name || 'Sem Conta'}\n`);

    const csvTransactions = await parseCSV(csvPath);
    console.log(`Lidos do CSV: ${csvTransactions.length} lançamentos válidos.\n`);

    if (csvTransactions.length === 0) return;

    const minDate = new Date(Math.min(...csvTransactions.map(t => t.date.getTime())));
    const maxDate = new Date(Math.max(...csvTransactions.map(t => t.date.getTime())));

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

    console.log(`--- DETALHAMENTO DA ANALISE ---`);

    for (const t of csvTransactions) {
        const hash = `${t.date.toISOString().split('T')[0]}_${t.amount}_${t.description.trim().toLowerCase()}`;

        // Verificacao mais flexivel - match apenas por data e valor exato
        const dateStr = t.date.toISOString().split('T')[0];
        const sameDateAndValue = dbTransactions.filter(dbT =>
            dbT.date.toISOString().split('T')[0] === dateStr && dbT.amount === t.amount
        );

        if (existingSet.has(hash)) {
            console.log(`[IGNORADA - IDÊNTICA] ${dateStr} - R$ ${t.amount} >> "${t.description}" já existe exatamente igual.`);
            ignoredCount++;
        } else if (sameDateAndValue.length > 0) {
            console.log(`[ATENÇÃO - PROVÁVEL DUPLICATA] ${dateStr} - R$ ${t.amount} >> CSV: "${t.description}" | DB: "${sameDateAndValue[0].description}"`);
            // O script Backend atual bloqueia apenas se FOR EXATAMENTE IGUAL O HASH.
            // Se a o usuário mudou o nome depois de lançar (ex: "McDonalds" e no CSV tá "Pag*McDonalds"),
            // Isso geraria uma duplicação na inserção real, então exibimos no report.
            newCount++;
        } else {
            console.log(`[NOVA] ${dateStr} - R$ ${t.amount} >> "${t.description}" seria inserida com sucesso.`);
            newCount++;
        }
    }

    console.log(`\n=== RESUMO DA SIMULAÇÃO ===`);
    console.log(`Total CSV: ${csvTransactions.length}`);
    console.log(`Ignoradas (Já cadastradas): ${ignoredCount}`);
    console.log(`Novas inserções geradas: ${newCount}`);
}

simularImportacao().catch(console.error).finally(() => prisma.$disconnect());
