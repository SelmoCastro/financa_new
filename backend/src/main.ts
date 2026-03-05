
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './setup';

async function bootstrap() {
  try {
    console.log('--- ENTRANDO NO BOOTSTRAP DO NESTJS ---');
    console.log('Versão do Node:', process.version);
    console.log('Verificando Variaveis de Ambiente Base:');
    console.log('Tem DATABASE_URL?', !!process.env.DATABASE_URL);
    console.log('Tem JWT_SECRET?', !!process.env.JWT_SECRET);
    console.log('Iniciando NestFactory...');

    const app = await NestFactory.create(AppModule);
    console.log('NestFactory criado com sucesso. Configurando o App...');

    configureApp(app);
    console.log('App configurado (CORS, Pipes, Helmet).');

    const port = process.env.PORT ?? 3000;
    console.log(`Tentando conectar na porta: ${port} e host: 0.0.0.0`);

    await app.listen(port, '0.0.0.0');
    console.log(`🚀 Aplicação online na porta: ${port}`);
  } catch (error) {
    console.error('\n❌ ERRO FATAL AO INICIAR O SERVIDOR NESTJS ❌\n');
    console.error('Nome do Erro:', error?.name);
    console.error('Mensagem:', error?.message);
    console.error('Stack Trace Completa:', error?.stack);
    console.error('\nO Servidor está morrendo intencionalmente após logar o erro acima.');
    process.exit(1);
  }
}
bootstrap();

