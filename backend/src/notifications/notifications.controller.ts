/**
 * Controller HTTP do domínio de notificações; recebe as requisições, aplica guards/decorators e delega a regra de negócio aos services.
 */
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Request,
  UseGuards,
  Param,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { HandleActionDto } from '../payments/dto/payment.dto';
import { RequestWithUser } from '../common/types/request-with-user';

@Controller({
  path: 'notifications',
  version: '1',
})
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(@Request() req: RequestWithUser) {
    return this.notificationsService.findAll(req.user.userId);
  }

  @Get('unread-count')
  async countUnread(@Request() req: RequestWithUser) {
    const count = await this.notificationsService.countUnread(req.user.userId);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.notificationsService.markAsRead(id, req.user.userId);
  }

  @Post('read-all')
  async markAllAsRead(@Request() req: RequestWithUser) {
    return this.notificationsService.markAllAsRead(req.user.userId);
  }

  @Post(':id/action')
  @UsePipes(new ValidationPipe({ transform: true }))
  async handleAction(
    @Param('id') id: string,
    @Body() dto: HandleActionDto,
    @Request() req: RequestWithUser,
  ) {
    return this.notificationsService.handleAction(
      id,
      dto.action,
      req.user.userId,
    );
  }
}
