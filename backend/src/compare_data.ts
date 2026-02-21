import * as fs from 'fs';

// Read JSON
const dumpData = JSON.parse(fs.readFileSync('transactions_dump.json', 'utf8'));
const dbTransactions: any[] = dumpData.transactions;

// Read CSV
const csvContent = fs.readFileSync('../Extrato conta corrente - 022026.csv', 'latin1');
const csvLines = csvContent.split('\n').filter(line => line.trim() !== '');

// Parse CSV manually
const csvTransactions: any[] = [];

for (let i = 1; i < csvLines.length; i++) {
    const line = csvLines[i];
    // Remove surrounding quotes and split
    const cleanLine = line.replace(/(^"|"$)/g, '');
    const parts = cleanLine.split('","');

    if (parts.length >= 5) {
        const rawDate = parts[0];
        const description = parts[1];
        const details = parts[2];
        const rawAmount = parts[4];

        // Ignore summary rows
        if (rawDate === "00/00/0000" || description.includes("S A L D O") || description.includes("Saldo")) continue;

        // parse date
        if (!rawDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) continue;
        const [day, month, year] = rawDate.split('/');
        const dateStr = `${year}-${month}-${day}`;

        // only >= 2026-02-12
        if (dateStr >= "2026-02-12") {
            const amountStr = rawAmount.replace(/\./g, '').replace(',', '.');
            const amountParsed = Math.abs(parseFloat(amountStr));
            const isExpense = rawAmount.includes('-');

            csvTransactions.push({
                dateStr,
                description,
                details,
                amount: amountParsed,
                type: isExpense ? 'EXPENSE' : 'INCOME'
            });
        }
    }
}

console.log(`Transactions in DB (from 12/02): ${dbTransactions.length}`);
console.log(`Transactions in CSV (from 12/02): ${csvTransactions.length}`);

const dbUnmatched = [...dbTransactions];
const csvUnmatched: any[] = [];

for (const csvTx of csvTransactions) {
    // Find a matching transaction in DB by date, type, and amount
    const matchIdx = dbUnmatched.findIndex(dbTx => {
        // some dates in DB might be stored with different times. 
        // Using startsWith on ISO string should work for default UTC T00:00:00
        const matchesDate = dbTx.date.startsWith(csvTx.dateStr);
        const matchesAmount = Math.abs(dbTx.amount - csvTx.amount) < 0.01;
        const matchesType = dbTx.type === csvTx.type;
        return matchesDate && matchesAmount && matchesType;
    });

    if (matchIdx !== -1) {
        dbUnmatched.splice(matchIdx, 1);
    } else {
        csvUnmatched.push(csvTx);
    }
}

console.log("\n--- UNMATCHED IN CSV (Missing in DB) ---");
csvUnmatched.forEach(tx => {
    console.log(`${tx.dateStr} | ${tx.type === 'EXPENSE' ? '-' : '+'}${tx.amount.toFixed(2)} | ${tx.description} | ${tx.details}`);
});

console.log("\n--- UNMATCHED IN DB (Not in CSV) ---");
dbUnmatched.forEach(tx => {
    const dateStr = tx.date.split('T')[0];
    console.log(`${dateStr} | ${tx.type === 'EXPENSE' ? '-' : '+'}${tx.amount.toFixed(2)} | ${tx.description} | DB_Cat: ${tx.categoryLegacy}`);
});
