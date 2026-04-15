#!/usr/bin/env node
/**
 * Debug específico de uma conta
 * Uso: node debug_specific_account.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 DEBUG DETALHADO - CONTA BB CHECKING DO SELMO\n');
  
  // Buscar usuário Selmo
  const user = await prisma.user.findUnique({
    where: { email: 's.elmo@live.com' },
    include: {
      accounts: {
        where: { type: 'CHECKING', name: 'Banco do Brasil' },
        include: {
          transactions: {
            orderBy: { date: 'asc' }, // Todas em ordem cronológica
          },
        },
      },
    },
  });
  
  if (!user || user.accounts.length === 0) {
    console.log('Conta não encontrada!');
    return;
  }
  
  const account = user.accounts[0];
  console.log(`Conta: ${account.name} (${account.type})`);
  console.log(`Saldo no DB: R$ ${account.balance.toFixed(2)}`);
  console.log(`\n📊 TODAS AS TRANSAÇÕES (em ordem cronológica):\n`);
  
  let saldoCalculado = 0;
  console.log('ID | Data | Tipo | Valor | Descrição | Saldo Acumulado');
  console.log('─'.repeat(100));
  
  for (const tx of account.transactions) {
    if (tx.type === 'INCOME') {
      saldoCalculado += tx.amount;
    } else if (tx.type === 'EXPENSE') {
      saldoCalculado -= tx.amount;
    }
    
    const sinal = tx.type === 'INCOME' ? '+' : '-';
    const valor = tx.type === 'INCOME' ? tx.amount : -tx.amount;
    const data = tx.date.toISOString().split('T')[0];
    
    console.log(`${tx.id.split('-')[0]}... | ${data} | ${tx.type.padEnd(7)} | ${sinal} R$ ${Math.abs(valor).toFixed(2).padStart(10)} | ${tx.description.padEnd(30)} | R$ ${saldoCalculado.toFixed(2)}`);
  }
  
  console.log('─'.repeat(100));
  console.log(`\nSaldo Calculado Final: R$ ${saldoCalculado.toFixed(2)}`);
  console.log(`Saldo no DB: R$ ${account.balance.toFixed(2)}`);
  console.log(`Diferença: R$ ${(saldoCalculado - account.balance).toFixed(2)}`);
  
  if (Math.abs(saldoCalculado - account.balance) > 0.01) {
    console.log('\n🚨 SALDO INCORRETO!');
    console.log('\n📝 PARA CORRIGIR, execute no banco:');
    console.log(`   UPDATE "Account" SET balance = ${saldoCalculado} WHERE id = '${account.id}';`);
  } else {
    console.log('\n✅ SALDO CORRETO!');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
