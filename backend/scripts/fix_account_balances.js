#!/usr/bin/env node
/**
 * Script para corrigir saldo de todas as contas
 * Uso: cd backend && node fix_account_balances.js
 * 
 * Este script:
 * 1. Para cada conta, recalcula o saldo baseado nas transações
 * 2. Atualiza o saldo no banco de dados
 * 3. Mostra um relatório do que foi corrigido
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔧 CORREÇÃO DE SALDOS DE CONTAS\n');
  
  const accounts = await prisma.account.findMany({
    include: {
      transactions: {
        select: {
          id: true,
          type: true,
          amount: true,
        },
      },
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
  });
  
  let totalCorrigido = 0;
  let contasCorrigidas = 0;
  
  for (const account of accounts) {
    const saldoAtual = account.balance;
    
    // Calcular saldo baseado nas transações
    let saldoCalculado = 0;
    let tiposInvalidos = [];
    
    for (const tx of account.transactions) {
      if (tx.type === 'INCOME') {
        saldoCalculado += tx.amount;
      } else if (tx.type === 'EXPENSE') {
        saldoCalculado -= tx.amount;
      } else {
        tiposInvalidos.push({ id: tx.id, type: tx.type });
      }
    }
    
    const diferenca = saldoCalculado - saldoAtual;
    
    if (Math.abs(diferenca) > 0.01) {
      console.log(`\n🏦 CONTA: ${account.name}`);
      console.log(`   Usuário: ${account.user.name || account.user.email}`);
      console.log(`   Saldo ANTES: R$ ${saldoAtual.toFixed(2)}`);
      console.log(`   Saldo DEPOIS: R$ ${saldoCalculado.toFixed(2)}`);
      console.log(`   Correção: R$ ${diferenca > 0 ? '+' : ''}${diferenca.toFixed(2)}`);
      
      if (tiposInvalidos.length > 0) {
        console.log(`   ⚠️ Transações com tipo inválido: ${tiposInvalidos.map(t => t.id).join(', ')}`);
      }
      
      // Atualizar saldo
      await prisma.account.update({
        where: { id: account.id },
        data: { balance: saldoCalculado },
      });
      
      totalCorrigido += Math.abs(diferenca);
      contasCorrigidas++;
    }
  }
  
  console.log('\n' + '═'.repeat(80));
  console.log('✅ CONCLUÍDO!');
  console.log(`   Contas corrigidas: ${contasCorrigidas}`);
  console.log(`   Total ajustado: R$ ${totalCorrigido.toFixed(2)}`);
  console.log('═'.repeat(80) + '\n');
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
