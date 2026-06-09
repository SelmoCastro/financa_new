/**
 * Controller HTTP do domínio de recursos sociais; recebe as requisições, aplica guards/decorators e delega a regra de negócio aos services.
 */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SocialService } from './social.service';
import { RequireVerifiedEmail } from '../auth/require-verified-email.decorator';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { RequestWithUser } from '../common/types/request-with-user';

@Controller({
  path: 'social',
  version: '1',
})
@UseGuards(AuthGuard('jwt'))
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get('invites')
  async findAllInvites(@Request() req: RequestWithUser) {
    return this.socialService.findAllReceived(req.user.userId);
  }

  @Post('invites/:id/accept')
  @RequireVerifiedEmail()
  async acceptInvite(
    @Param('id') id: string,
    @Body() body: AcceptInviteDto,
    @Request() req: RequestWithUser,
  ) {
    return this.socialService.acceptInvite(
      id,
      req.user.userId,
      body.accountId,
      body.categoryId,
    );
  }

  @Patch('invites/:id/reject')
  async rejectInvite(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.socialService.rejectInvite(id, req.user.userId);
  }
}
