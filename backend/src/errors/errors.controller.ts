/**
 * Controller HTTP do domínio de relatos de erro; recebe as requisições, aplica guards/decorators e delega a regra de negócio aos services.
 */
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
  async reportError(
    @Body() dto: CreateErrorReportDto,
    @Request() req: { user?: { userId?: string } },
  ) {
    // If user is authenticated, override userId from JWT token (not from client body)
    if (req.user?.userId) {
      dto.userId = req.user.userId;
    }
    return this.errorsService.createReport(dto);
  }
}
