import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './setup';

async function bootstrap() {
  try {
    console.log('--- ENTRANDO NO BOOTSTRAP DO NESTJS ---');
    console.log('Versão do Node:', process.version);

    // Validacao obrigatoria de variaveis de ambiente
    const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
    const missing = requiredEnvVars.filter(v => !process.env[v]);
    if (missing.length > 0) {
      console.error(`\n❌ VARIÁVEIS DE AMBIENTE OBRIGATÓRIAS FALTANDO: ${missing.join(', ')}`);
      console.error('O servidor não pode iniciar sem essas variáveis.\n');
      process.exit(1);
    }

    // Avisos nao-fatais
    const optionalEnvVars = ['OPENROUTER_API_KEY', 'RESEND_API_KEY', 'FRONTEND_URL'];
    const missingOptional = optionalEnvVars.filter(v => !process.env[v]);
    if (missingOptional.length > 0) {
      console.warn(`⚠️  Variáveis opcionais ausentes: ${missingOptional.join(', ')}`);
      console.warn('   Funcionalidades de IA e Email podem não funcionar.\n');
    }

    console.log('Verificando Variaveis de Ambiente Base:');
    console.log('Tem DATABASE_URL?', !!process.env.DATABASE_URL);
    console.log('Tem JWT_SECRET?', !!process.env.JWT_SECRET);
    console.log('Iniciando NestFactory...');

    const app = await NestFactory.create(AppModule);
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
    console.log('NestFactory criado com sucesso. Configurando o App...');

    configureApp(app);
    console.log('App configurado (CORS, Pipes, Helmet).');

    // Migração: gerar transações para parcelamentos existentes (v1.8.19)
    try {
      const { PrismaService } = await import('./prisma/prisma.service');
      const prisma = new PrismaService();
      const installments = await prisma.creditCardInstallment.findMany({
        where: { isActive: true },
      });
      console.log(`📋 Migração: encontrados ${installments.length} parcelamentos ativos`);
      let migrated = 0;
      for (const inst of installments) {
        // Checar se já tem transações associadas
        const existing = await prisma.transaction.findMany({
          where: {
            userId: inst.userId,
            creditCardId: inst.creditCardId,
            description: { startsWith: inst.description },
            installmentCount: inst.installmentCount,
            type: 'EXPENSE',
            deletedAt: null,
          },
        });
        console.log(`  🔍 "${inst.description}" (${inst.installmentCount}x) — ${existing.length} transações existentes`);
        if (existing.length >= inst.installmentCount) continue;

        // Remover parciais
        if (existing.length > 0) {
          await prisma.transaction.deleteMany({ where: { id: { in: existing.map((t: any) => t.id) } } });
        }

        const entryAmount = inst.entryAmount ? Number(inst.entryAmount) : 0;
        const totalAmount = Number(inst.totalAmount);
        const ic = inst.installmentCount;
        let amountPerMonth: number;
        if (entryAmount > 0 && ic > 1) {
          amountPerMonth = Math.round(((totalAmount - entryAmount) / (ic - 1)) * 100) / 100;
        } else {
          amountPerMonth = Math.round((totalAmount / ic) * 100) / 100;
        }

        const start = new Date(inst.startDate);
        const txData: any[] = [];
        for (let i = 1; i <= ic; i++) {
          const mOff = i - 1;
          const dueDate = new Date(start.getFullYear(), start.getMonth() + mOff, inst.dueDay);
          const expMonth = (start.getMonth() + mOff) % 12;
          if (dueDate.getMonth() !== expMonth) dueDate.setDate(0);
          const amount = (entryAmount > 0 && i === 1) ? entryAmount : amountPerMonth;
          txData.push({
            description: `${inst.description}${ic > 1 ? ` (${i}/${ic})` : ''}`,
            amount,
            date: dueDate,
            type: 'EXPENSE',
            creditCardId: inst.creditCardId,
            userId: inst.userId,
            categoryId: inst.categoryId || null,
            accountId: inst.accountId || null,
            currentInstallment: i,
            installmentCount: ic,
          });
        }
        await prisma.transaction.createMany({ data: txData });
        console.log(`  ✅ Criadas ${ic} transações para "${inst.description}" no cartão ${inst.creditCardId}`);
        migrated++;
      }
      if (migrated > 0) console.log(`✅ Migração parcelamentos: ${migrated} migrados`);
      else console.log(`📋 Migração: nenhum parcelamento precisou de migração`);
      
      // Debug: verificar se transações com creditCardId existem
      const txWithCard = await prisma.transaction.findMany({
        where: { creditCardId: { not: null }, invoiceId: null, type: 'EXPENSE', deletedAt: null },
        select: { id: true, creditCardId: true, description: true, amount: true, installmentCount: true },
        take: 10,
      });
      console.log(`📋 Debug: ${txWithCard.length} transações não faturadas com creditCardId:`);
      txWithCard.forEach(t => console.log(`  → ${t.description} | R$${t.amount} | card=${t.creditCardId} | installments=${t.installmentCount}`));
      
      await prisma.$disconnect();
    } catch (migErr: any) {
      console.warn('⚠️  Migração de parcelamentos pulada:', migErr?.message || migErr);
    }

    const port = process.env.PORT ?? 3000;
    console.log(`Iniciando na porta: ${port}`);

    // Bind to 127.0.0.1 — nginx proxies to localhost, never expose directly
    const host = process.env.HOST || '127.0.0.1';
    await app.listen(port, host);
    console.log(`🚀 Aplicação online na porta: ${port} (host: ${host})`);
  } catch (error) {
    console.error('\n❌ ERRO FATAL AO INICIAR O SERVIDOR NESTJS ❌\n');
    console.error('Nome do Erro:', error?.name);
    console.error('Mensagem:', error?.message);
    if (process.env.NODE_ENV !== 'production') {
      console.error('Stack Trace Completa:', error?.stack);
    }
    console.error(
      '\nO Servidor está morrendo intencionalmente após logar o erro acima.',
    );
    process.exit(1);
  }
}
bootstrap();
