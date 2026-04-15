#!/usr/bin/env node
/**
 * Script para ver TODOS os usuários e seus saldos
 * Uso: cd backend && node debug_all_users.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 TODOS OS USUÁRIOS E SALDOS\n');
  console.log('═'.repeat(80));
  
  const users = await prisma.user.findMany({
    include: {
      accounts: {
        include: {
          transactions: {
            select: {
              id: true,
              type: true,
              amount: true,
              description: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      },
    },
  });
  
  console.log(`\n📊 Total de usuários: ${users.length}\n`);
  
  for (const user of users) {
    console.log('─'.repeat(80));
    console.log(`👤 USUÁRIO: ${user.name || 'N/A'} (${user.email})`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Criado em: ${user.createdAt.toISOString().split('T')[0]}`);
    console.log(`   Contas: ${user.accounts.length}`);
    
    for (const account of user.accounts) {
      const saldoAtual = account.balance;
      
      // Calcular saldo baseado nas transações
      let saldoCalculado = 0;
      for (const tx of account.transactions) {
        if (tx.type === 'INCOME') {
          saldoCalculado += tx.amount;
        } else if (tx.type === 'EXPENSE') {
          saldoCalculado -= tx.amount;
        }
      }
      
      const diferenca = saldoCalculado - saldoAtual;
      const status = Math.abs(diferenca) > 0.01 ? '🚨 ERRADO' : '✅ OK';
      
      console.log(`\n   🏦 CONTA: "${account.name}" (${account.type})`);
      console.log(`      Saldo no DB: R$ ${saldoAtual.toFixed(2)}`);
      console.log(`      Saldo Calculado: R$ ${saldoCalculado.toFixed(2)}`);
      console.log(`      Diferença: R$ ${diferenca > 0 ? '+' : ''}${diferenca.toFixed(2)} ${status}`);
      
      if (account.transactions.length > 0) {
        console.log(`      Últimas ${account.transactions.length} transações:`);
        account.transactions.forEach((tx) => {
          const sinal = tx.type === 'INCOME' ? '+' : '-';
          const valor = tx.type === 'INCOME' ? tx.amount : -tx.amount;
          console.log(`         ${sinal} R$ ${valor.toFixed(2)} - "${tx.description}"`);
        });
      } else {
        console.log(`      Sem transações`);
      }
    }
    console.log('');
  }
  
  console.log('═'.repeat(80));
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e.message);
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
