// Função utility para criar HASH criptográfico simples
async function generateSha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface ParsedOFXTransaction {
    fitId: string;
    date: Date;
    amount: number;
    description: string;
    type: 'INCOME' | 'EXPENSE';
}

/**
 * Lê o conteúdo em texto de um arquivo .ofx ou .qfx e converte em um array padronizado
 */
export async function parseOFX(content: string): Promise<ParsedOFXTransaction[]> {
    const transactions: ParsedOFXTransaction[] = [];

    // Extrai as blocos <STMTTRN> (Statement Transaction) do corpo OFX/SGML
    const trnRegex = /<STMTTRN>[\s\S]*?<\/STMTTRN>/g;
    const matches = content.match(trnRegex);

    if (!matches) {
        return transactions;
    }

    for (const block of matches) {
        // Parser das principais TAGS
        const typeMatch = block.match(/<TRNTYPE>(.+?)(?:\r?\n|<|$)/);
        const dateMatch = block.match(/<DTPOSTED>([0-9]{8,14})(?:\[.*?\])?(?:\r?\n|<|$)/);
        const amountMatch = block.match(/<TRNAMT>([-0-9.,]+)(?:\r?\n|<|$)/);
        const fitIdMatch = block.match(/<FITID>(.+?)(?:\r?\n|<|$)/);
        const memoMatch = block.match(/<MEMO>(.+?)(?:\r?\n|<|$)/); // Ou <NAME> dependendo do banco
        const nameMatch = block.match(/<NAME>(.+?)(?:\r?\n|<|$)/);

        // Tratamento de Descrição (Pega MEMO, se falhar tenta NAME)
        let rawDescription = (memoMatch ? memoMatch[1] : (nameMatch ? nameMatch[1] : 'Transação Desconhecida')).trim();
        // Removemos possíveis quebras de linha sujas do SGML
        rawDescription = rawDescription.replace(/\r?\n|\r/g, ' ');

        // Tratamento de Data (Formato OFX: YYYYMMDDHHMMSS)
        let dateObj = new Date();
        if (dateMatch && dateMatch[1].length >= 8) {
            const dStr = dateMatch[1];
            const year = parseInt(dStr.slice(0, 4), 10);
            const month = parseInt(dStr.slice(4, 6), 10) - 1;
            const day = parseInt(dStr.slice(6, 8), 10);

            const hour = dStr.length >= 10 ? parseInt(dStr.slice(8, 10), 10) : 0;
            const min = dStr.length >= 12 ? parseInt(dStr.slice(10, 12), 10) : 0;
            const sec = dStr.length >= 14 ? parseInt(dStr.slice(12, 14), 10) : 0;

            dateObj = new Date(Date.UTC(year, month, day, hour, min, sec));
        }

        // Tratamento do Valor
        let amount = 0;
        if (amountMatch) {
            // Valor pode vir como -123.45 ou -123,45 dependendo do banco bizarro.
            amount = parseFloat(amountMatch[1].replace(',', '.'));
        }

        // Tipo: Em OFX existe <TRNTYPE>DEBIT ou CREDIT
        let type: 'INCOME' | 'EXPENSE' = amount >= 0 ? 'INCOME' : 'EXPENSE';
        if (typeMatch) {
            if (typeMatch[1].toUpperCase() === 'CREDIT' || typeMatch[1].toUpperCase() === 'DEP') type = 'INCOME';
            if (typeMatch[1].toUpperCase() === 'DEBIT' || typeMatch[1].toUpperCase() === 'PAYMENT') type = 'EXPENSE';
        }

        // Identificador Unico Absoluto da OFX (FITID). Se por acaso o banco nao mandar, fazemos Fallback pra HASH
        let finalFitId = '';
        if (fitIdMatch && fitIdMatch[1].trim() !== '') {
            finalFitId = fitIdMatch[1].trim();
        } else {
            const fallBackString = `${dateObj.toISOString().split('T')[0]}_${amount}_${rawDescription}`;
            finalFitId = await generateSha256(fallBackString);
        }

        transactions.push({
            fitId: finalFitId,
            date: dateObj,
            amount: Math.abs(amount), // Padrão da aplicação é amount positivo + type
            description: rawDescription,
            type
        });
    }

    return transactions;
}
