/**
 * Módulo NestJS do domínio de versão do aplicativo; agrupa controllers, services e dependências necessárias para este contexto.
 */
import { Module } from '@nestjs/common';
import { AppVersionController } from './app-version.controller';

@Module({
  controllers: [AppVersionController],
})
export class AppVersionModule {}
