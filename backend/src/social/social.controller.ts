import { Controller, Get, Post, Body, Param, Request, UseGuards, Patch } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SocialService } from './social.service';

@Controller({
    path: 'social',
    version: '1',
})
@UseGuards(AuthGuard('jwt'))
export class SocialController {
    constructor(private readonly socialService: SocialService) { }

    @Get('invites')
    async findAllInvites(@Request() req) {
        return this.socialService.findAllReceived(req.user.userId);
    }

    @Post('invites/:id/accept')
    async acceptInvite(
        @Param('id') id: string,
        @Body() body: { accountId: string; categoryId: string },
        @Request() req,
    ) {
        return this.socialService.acceptInvite(id, req.user.userId, body.accountId, body.categoryId);
    }

    @Patch('invites/:id/reject')
    async rejectInvite(@Param('id') id: string, @Request() req) {
        return this.socialService.rejectInvite(id, req.user.userId);
    }
}
