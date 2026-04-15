#!/usr/bin/env node
/**
 * Script para debugar saldo de contas após edição de transação
 * Uso: cd backend && node debug_account_balance.js
 */

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log('\n🔍 DEBUG DE SALDO DE CONTAS\n');
  
  // 1. Pega o email do usuário
  const email = await askQuestion('Email do usuário: ');
  
  const user = await prisma.user.findUnique({
    where: { email },
    include: { accounts: true },
  });
  
  if (!user) {
    console.log(`\n❌ Usuário "${email}" não encontrado!`);
    rl.close();
    return;
  }
  
  console.log(`\n✅ Usuário encontrado: ${user.name || email}`);
  console.log(`\n📊 CONTAS DO USUÁRIO:`);
  console.log('─'.repeat(80));
  
  for (const account of user.accounts) {
    console.log(`\n🏦 CONTA: ${account.name}`);
    console.log(`   ID: ${account.id}`);
    console.log(`   Tipo: ${account.type}`);
    console.log(`   Saldo no DB: R$ ${account.balance.toFixed(2)}`);
    
    // Buscar transações
    const transactions = await prisma.transaction.findMany({
      where: { accountId: account.id },
      orderBy: { date: 'desc' },
      take: 50,
    });
    
    // Calcular saldo esperado
    let saldoEsperado = 0;
    for (const tx of transactions) {
      if (tx.type === 'INCOME') {
        saldoEsperado += tx.amount;
      } else if (tx.type === 'EXPENSE') {
        saldoEsperado -= tx.amount;
      } else {
        console.log(`   ⚠️ Transação com tipo DESCONHECIDO: ${tx.id} | type="${tx.type}"`);
      }
    }
    
    console.log(`   Saldo Calculado: R$ ${saldoEsperado.toFixed(2)}`);
    console.log(`   Diferença: R$ ${(account.balance - saldoEsperado).toFixed(2)}`);
    
    if (account.balance !== saldoEsperado) {
      console.log(`   🚨 ERRO: Saldo no DB != Saldo calculado das transações!`);
    } else {
      console.log(`   ✅ Saldo correto!`);
    }
    
    console.log(`\n   📋 ÚLTIMAS TRANSAÇÕES:`);
    transactions.slice(0, 10).forEach((tx, idx) => {
      const sinal = tx.type === 'INCOME' ? '+' : '-';
      const valorSinal = tx.type === 'INCOME' ? tx.amount : -tx.amount;
      console.log(`      ${idx + 1}. [${tx.type}] R$ ${valorSinal.toFixed(2)} - "${tx.description}" (${tx.date.toISOString().split('T')[0]})`);
    });
  }
  
  rl.close();
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
