import { Controller, Post, Body } from '@nestjs/common';
import { ErrorsService } from './errors.service';
import { CreateErrorReportDto } from './dto/create-error-report.dto';

@Controller({
  path: 'errors',
  version: '1',
})
export class ErrorsController {
  constructor(private readonly errorsService: ErrorsService) {}

  @Post('report')
  async reportError(@Body() dto: CreateErrorReportDto) {
    return this.errorsService.createReport(dto);
  }
}