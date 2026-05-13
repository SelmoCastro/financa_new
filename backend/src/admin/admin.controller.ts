import { Controller, Get, Patch, Param, Body, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../common/guards/admin.guard';
import { AdminService } from './admin.service';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Controller({
  path: 'admin',
  version: '1',
})
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /** GET /v1/admin/stats — Numeros gerais */
  @Get('stats')
  getStats(@Request() req) {
    return this.adminService.getStats(req.user.userId);
  }

  /** GET /v1/admin/users — Lista usuarios com contadores */
  @Get('users')
  getUsers(@Request() req) {
    return this.adminService.getUsers(req.user.userId);
  }

  /** GET /v1/admin/activity — Atividade recente */
  @Get('activity')
  getRecentActivity(@Request() req) {
    return this.adminService.getRecentActivity(req.user.userId);
  }

  /** GET /v1/admin/health — Saude do sistema */
  @Get('health')
  getSystemHealth(@Request() req) {
    return this.adminService.getSystemHealth(req.user.userId);
  }

  /** GET /v1/admin/plans — Stats de planos */
  @Get('plans')
  getPlanStats(@Request() req) {
    return this.adminService.getPlanStats(req.user.userId);
  }

  /** PATCH /v1/admin/users/:id/plan — Alterar plano de um usuario */
  @Patch('users/:id/plan')
  updateUserPlan(
    @Param('id') userId: string,
    @Body() dto: UpdatePlanDto,
    @Request() req,
  ) {
    return this.adminService.updateUserPlan(
      req.user.userId,
      userId,
      dto.plan,
      dto.duration,
    );
  }

  /** GET /v1/admin/security — Security stats: behavioral throttle, audit summary */
  @Get('security')
  getSecurityStats(@Request() req) {
    return this.adminService.getSecurityStats(req.user.userId);
  }
}