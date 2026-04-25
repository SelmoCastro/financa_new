import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ErrorsService } from './errors.service';
import { CreateErrorReportDto } from './dto/create-error-report.dto';

@Controller({
  path: 'errors',
  version: '1',
})
export class ErrorsController {
  constructor(private readonly errorsService: ErrorsService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 reports per minute per IP
  @Post('report')
  async reportError(@Body() dto: CreateErrorReportDto) {
    return this.errorsService.createReport(dto);
  }
}