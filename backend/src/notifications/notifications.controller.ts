import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Request,
  UseGuards,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';

@Controller({
  path: 'notifications',
  version: '1',
})
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(@Request() req) {
    return this.notificationsService.findAll(req.user.userId);
  }

  @Get('unread-count')
  async countUnread(@Request() req) {
    const count = await this.notificationsService.countUnread(req.user.userId);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    return this.notificationsService.markAsRead(id, req.user.userId);
  }

  @Post('read-all')
  async markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.userId);
  }

  @Post(':id/action')
  async handleAction(
    @Param('id') id: string,
    @Body() body: { action: string },
    @Request() req,
  ) {
    if (!['confirm', 'postpone'].includes(body.action)) {
      throw new BadRequestException('Ação inválida. Use: confirm ou postpone');
    }
    return this.notificationsService.handleAction(
      id,
      body.action,
      req.user.userId,
    );
  }
}
