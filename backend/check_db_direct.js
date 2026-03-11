
const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://neondb_owner:npg_nfCuqOShRX73@ep-square-shadow-aexhppyt.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"
});

async function main() {
  await client.connect();
  console.log('--- RELATÓRIO DE SALDOS ---');

  // 1. Saldo das Contas
  const accountsRes = await client.query('SELECT name, balance FROM "Account"');
  console.log('\nSaldos nas Contas:');
  accountsRes.rows.forEach(row => {
    console.log(`- ${row.name}: R$ ${row.balance.toFixed(2)}`);
  });

  // 2. Soma de Transações por Tipo
  const transRes = await client.query('SELECT type, SUM(amount) as total FROM "Transaction" GROUP BY type');
  console.log('\nResumo de Transações (Todas):');
  transRes.rows.forEach(row => {
    console.log(`- ${row.type}: R$ ${parseFloat(row.total).toFixed(2)}`);
  });

  // 3. Verificar Transações com valores estranhos (mesmo após limpeza)
  const strangeRes = await client.query('SELECT description, amount, date FROM "Transaction" WHERE amount > 100000 OR amount < 0');
  if (strangeRes.rows.length > 0) {
    console.log('\nTransações Suspeitas (>100k ou <0):');
    strangeRes.rows.forEach(row => {
      console.log(`- [${row.date.toISOString().slice(0,10)}] ${row.description}: R$ ${row.amount}`);
    });
  }

  await client.end();
}

main().catch(console.error);
