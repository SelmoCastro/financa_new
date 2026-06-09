/**
 * Módulo NestJS do domínio de infraestrutura compartilhada; agrupa controllers, services e dependências necessárias para este contexto.
 */
import { Module, Global } from '@nestjs/common';
import { EncryptionService } from './encryption.service';

@Global()
@Module({
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class EncryptionModule {}
