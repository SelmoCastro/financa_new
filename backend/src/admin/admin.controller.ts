import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';

@Controller({
  path: 'admin',
  version: '1',
})
@UseGuards(AuthGuard('jwt'))
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
}