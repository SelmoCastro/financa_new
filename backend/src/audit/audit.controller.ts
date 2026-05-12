import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../common/guards/admin.guard';

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

  /**
   * Verify the integrity of the audit chain.
   * Returns whether the hash chain is intact and where it breaks (if it does).
   * Admin-only endpoint for forensic investigations.
   */
  @Get('verify-integrity')
  @UseGuards(AdminGuard)
  async verifyIntegrity() {
    return this.auditService.verifyChain();
  }
}