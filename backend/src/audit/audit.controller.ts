import { Controller, Get, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../common/guards/admin.guard';
import { AuditAction } from './audit.service';

interface RequestWithUser {
  user: { userId: string; isAdmin: boolean };
}

@Controller({ path: 'audit', version: '1' })
@UseGuards(AuthGuard('jwt'))
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async getMyLogs(
    @Request() req: RequestWithUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('resource') resource?: string,
    @Query('action') action?: string,
  ) {
    return this.auditService.findByUser(
      req.user.userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
      resource,
      action,
    );
  }

  @Get('admin')
  @UseGuards(AdminGuard)
  async getAllLogs(
    @Request() req: RequestWithUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('resource') resource?: string,
    @Query('action') action?: string,
  ) {
    return this.auditService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
      resource,
      action,
    );
  }
}