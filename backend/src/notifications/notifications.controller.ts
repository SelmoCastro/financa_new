import { Controller, Get, Post, Patch, Request, UseGuards, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';

@Controller({
    path: 'notifications',
    version: '1',
})
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

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
}
