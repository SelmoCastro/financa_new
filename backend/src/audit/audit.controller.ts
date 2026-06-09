/**
 * Controller HTTP do domínio de auditoria; recebe as requisições, aplica guards/decorators e delega a regra de negócio aos services.
 */
import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from './audit.service';
import { AdminGuard } from '../common/guards/admin.guard';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: { userId: string; email: string };
}

@Controller('v1/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * GET /v1/audit/logs — Query audit logs (admin only)
   * Query params: actorId, action, targetType, targetId, severity, from, to, limit, offset
   */
  @Get('logs')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async queryLogs(
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('targetType') targetType?: string,
    @Query('targetId') targetId?: string,
    @Query('severity') severity?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.auditService.query({
      actorId,
      action,
      targetType,
      targetId,
      severity,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  /**
   * GET /v1/audit/my — Get audit logs for the current user
   */
  @Get('my')
  @UseGuards(AuthGuard('jwt'))
  async getMyLogs(
    @Req() req: RequestWithUser,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.auditService.query({
      actorId: req.user.userId,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  /**
   * GET /v1/audit/verify — Verify the integrity of the audit log chain (admin only)
   */
  @Get('verify')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  async verifyChain() {
    return this.auditService.verifyChain();
  }
}
