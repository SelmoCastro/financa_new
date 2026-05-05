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

    console.error(`[ErrorReport] ${dto.platform || 'unknown'} | v${dto.appVersion || '?'} | ${dto.message}`);

    return report;
  }
}