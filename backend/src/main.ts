import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './setup';

async function bootstrap() {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
      console.log('--- ENTRANDO NO BOOTSTRAP DO NESTJS ---');
      console.log('Versão do Node:', process.version);
    }

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

    // ── P0: Validação de segurança de segredos ──
    // Impede que o servidor suba com chaves fracas ou padrão de teste em produção
    const jwtSecret = process.env.JWT_SECRET || '';
    const WEAK_SECRETS = [
      'super-secret-key-change-in-production',
      'sua-chave-secreta-aqui',
      'secret',
      'password',
      'changeme',
      'jwt_secret',
      'jwt-secret',
    ];
    if (jwtSecret.length < 32) {
      console.error(`\n❌ FATAL: JWT_SECRET tem ${jwtSecret.length} caracteres — mínimo exigido: 32`);
      console.error('   Gere uma chave forte com: node -e "console.log(require(\"crypto\").randomBytes(32).toString(\"hex\"))"');
      process.exit(1);
    }
    if (WEAK_SECRETS.some(weak => jwtSecret.toLowerCase().includes(weak.toLowerCase()))) {
      console.error('\n❌ FATAL: JWT_SECRET contiene um valor padrão ou fraco');
      console.error('   Valor atual começa com: "' + jwtSecret.substring(0, 8) + '..."');
      console.error('   Gere uma chave forte com: node -e "console.log(require(\"crypto\").randomBytes(32).toString(\"hex\"))"');
      process.exit(1);
    }

    // Validar MERCADOPAGO_ACCESS_TOKEN em produção
    if (process.env.NODE_ENV === 'production' && process.env.MERCADOPAGO_ACCESS_TOKEN) {
      const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (mpToken.includes('TEST-')) {
        console.error('\n❌ FATAL: MERCADOPAGO_ACCESS_TOKEN de TESTE em produção!');
        console.error('   Revogue o token de teste e gere um de produção no painel do Mercado Pago.');
        process.exit(1);
      }
      if (!process.env.MERCADOPAGO_WEBHOOK_SECRET) {
        console.error('\n❌ FATAL: MERCADOPAGO_WEBHOOK_SECRET ausente em produção!');
        console.error('   Webhooks de pagamento não podem processar sem assinatura HMAC.');
        process.exit(1);
      }
    }

    // Aviso se ENCRYPTION_KEY não está definida (criptografia de campos desabilitada)
    if (!process.env.ENCRYPTION_KEY) {
      console.warn('⚠️  ENCRYPTION_KEY não definida — criptografia de campos sensíveis desabilitada');
      console.warn('   Para ativar, gere uma chave: node -e "console.log(require(\"crypto\").randomBytes(32).toString(\"hex\"))"\n');
    } else if (process.env.ENCRYPTION_KEY.length !== 64) {
      console.error('\n❌ FATAL: ENCRYPTION_KEY deve ter 256 bits (64 hex chars)');
      process.exit(1);
    }

    if (!isProduction) {
      console.log('✅ Validação de segredos: OK');
      console.log('Iniciando NestFactory...');
    }

    const app = await NestFactory.create(AppModule);
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
    if (!isProduction) console.log('NestFactory criado com sucesso. Configurando o App...');

    configureApp(app);
    if (!isProduction) console.log('App configurado (CORS, Pipes, Helmet).');

    const port = process.env.PORT ?? 3000;
    if (!isProduction) console.log(`Iniciando na porta: ${port}`);

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
