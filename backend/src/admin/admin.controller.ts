/**
 * Controller HTTP do domínio de administração; recebe as requisições, aplica guards/decorators e delega a regra de negócio aos services.
 */
import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../common/guards/admin.guard';
import { RequestWithUser } from '../common/types/request-with-user';
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
  getStats(@Request() req: RequestWithUser) {
    return this.adminService.getStats(req.user.userId);
  }

  /** GET /v1/admin/users — Lista usuarios com contadores */
  @Get('users')
  getUsers(@Request() req: RequestWithUser) {
    return this.adminService.getUsers(req.user.userId);
  }

  /** GET /v1/admin/activity — Atividade recente */
  @Get('activity')
  getRecentActivity(@Request() req: RequestWithUser) {
    return this.adminService.getRecentActivity(req.user.userId);
  }

  /** GET /v1/admin/health — Saude do sistema */
  @Get('health')
  getSystemHealth(@Request() req: RequestWithUser) {
    return this.adminService.getSystemHealth(req.user.userId);
  }

  /** GET /v1/admin/plans — Stats de planos */
  @Get('plans')
  getPlanStats(@Request() req: RequestWithUser) {
    return this.adminService.getPlanStats(req.user.userId);
  }

  /** PATCH /v1/admin/users/:id/plan — Alterar plano de um usuario */
  @Patch('users/:id/plan')
  updateUserPlan(
    @Param('id') userId: string,
    @Body() dto: UpdatePlanDto,
    @Request() req: RequestWithUser,
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
  getSecurityStats(@Request() req: RequestWithUser) {
    return this.adminService.getSecurityStats(req.user.userId);
  }

  /** DELETE /v1/admin/users/:id — Delete a user and all their data */
  @Delete('users/:id')
  deleteUser(@Param('id') userId: string, @Request() req: RequestWithUser) {
    return this.adminService.deleteUser(req.user.userId, userId);
  }
}
