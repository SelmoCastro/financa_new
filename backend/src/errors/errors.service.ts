/**
 * Service do domínio de relatos de erro; concentra as regras de negócio, validações e operações de banco ligadas a este fluxo.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateErrorReportDto } from './dto/create-error-report.dto';

@Injectable()
export class ErrorsService {
  constructor(private prisma: PrismaService) {}

  async createReport(dto: CreateErrorReportDto) {
    const data: {
      message: string;
      platform: string;
      stack?: string;
      componentStack?: string;
      appVersion?: string;
      deviceId?: string;
      userId?: string;
      createdAt?: Date;
    } = {
      message: dto.message,
      platform: dto.platform || 'unknown',
    };

    if (dto.stack) data.stack = dto.stack;
    if (dto.componentStack) data.componentStack = dto.componentStack;
    if (dto.appVersion) data.appVersion = dto.appVersion;
    if (dto.deviceId) data.deviceId = dto.deviceId;
    if (dto.userId) data.userId = dto.userId;
    if (dto.timestamp) data.createdAt = new Date(dto.timestamp);

    const report = await this.prisma.errorReport.create({ data });

    console.error(
      `[ErrorReport] ${dto.platform || 'unknown'} | v${dto.appVersion || '?'} | ${this.sanitizeForLog(dto.message)}`,
    );

    return report;
  }

  private sanitizeForLog(value: string): string {
    return value
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
      .replace(
        /(access_token|refreshToken|authorization|password|senha)=?\s*[^\s&]+/gi,
        '$1=[REDACTED]',
      )
      .slice(0, 300);
  }
}
