import { Controller, Post, Body, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { ErrorsService } from './errors.service';
import { CreateErrorReportDto } from './dto/create-error-report.dto';

@Controller({
  path: 'errors',
  version: '1',
})
export class ErrorsController {
  constructor(private readonly errorsService: ErrorsService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 reports per minute per IP
  @UseGuards(OptionalJwtAuthGuard)
  @Post('report')
  async reportError(@Body() dto: CreateErrorReportDto, @Request() req: any) {
    // If user is authenticated, override userId from JWT token
    if (req.user?.sub) {
      dto.userId = req.user.sub;
    }
    return this.errorsService.createReport(dto);
  }
}