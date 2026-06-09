/**
 * Módulo NestJS do domínio de infraestrutura compartilhada; agrupa controllers, services e dependências necessárias para este contexto.
 */
import { Module } from '@nestjs/common';
import { OcrService } from './ocr.service';

@Module({
  providers: [OcrService],
  exports: [OcrService],
})
export class OcrModule {}
